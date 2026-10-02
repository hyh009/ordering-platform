import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { tDefault } from '@/app/i18n';
import { sendAiOrderingMessageSchema } from '@/models/aiOrdering';
import { toAiOrderingCartRequest } from '@/models/aiOrdering';
import { storeFrontAiOrderingService } from '@/services/storeFrontAiOrdering.service';
import {
  mapStoreFrontApiError,
  type StoreFrontCommandFailure,
  type StoreFrontCommandFailureReason,
} from '@/services/utils/storeFrontApiError';

import type {
  AiOrderingOperationResult,
  AiOrderingTurn,
  SendAiOrderingMessageRequest,
} from '@/models/aiOrdering';
import type { StoreFrontAiOrderingActions } from './actions';
import type { AiOrderingProposalRow, StoreFrontAiOrderingStore } from './store';
import { toAiOrderingPreviousOutcome } from './outcome';
import type { StoreFrontCartCommands } from '../cart/commands';
import type { TenantStore } from '../tenant/store';

export type AiOrderingSendResult =
  | { status: 'sent'; turn: AiOrderingTurn }
  | StoreFrontCommandFailure;

export type AiOrderingApplyResult =
  | { status: 'applied'; results: AiOrderingOperationResult[] }
  | StoreFrontCommandFailure;

export type AiOrderingLoadResult =
  | { status: 'loaded' }
  | StoreFrontCommandFailure;

export type StoreFrontAiOrderingCommands = {
  /**
   * Reads this guest's stored transcript into the panel, once per cart.
   *
   * Idempotent on purpose: the panel calls it every time it opens, and only the
   * first call for a given conversation reaches the network.
   */
  loadConversation(expectedStoreId: string): Promise<AiOrderingLoadResult>;
  /**
   * Sends one guest turn. Expires any open proposal first and reports its
   * outcome on this request.
   */
  sendMessage(
    expectedStoreId: string,
    input: {
      message: string;
      responseToPromptId?: string;
      selectedOptionId?: string;
    },
  ): Promise<AiOrderingSendResult>;
  /** Applies every row the guest has not dismissed, in the proposal's order. */
  applyProposal(expectedStoreId: string): Promise<AiOrderingApplyResult>;
  /**
   * Re-attempts one row that failed, leaving every other row as it is.
   *
   * Only worth offering where the failure could plausibly clear on its own; the
   * panel decides that from the row's reason and only then shows the control.
   */
  retryOperation(
    expectedStoreId: string,
    operationId: string,
  ): Promise<AiOrderingApplyResult>;
  dismissOperation(operationId: string): void;
  resetConversation(): void;
};

/**
 * Whether a failed row says anything about the rows after it.
 *
 * `item` means the refusal is a property of that one operation — the product is
 * sold out, the id is gone, the options no longer validate — so the remaining
 * rows are still worth attempting and the guest gets one complete report.
 * `session` means the refusal is a property of the session, the cart, the store,
 * or the connection, so every remaining call would fail identically and the loop
 * stops instead of spending requests proving it.
 *
 * Exhaustive on purpose: a new failure reason cannot be added without deciding
 * which of the two it is.
 */
const APPLY_FAILURE_SCOPE: Record<
  StoreFrontCommandFailureReason,
  'item' | 'session'
> = {
  'session-expired': 'session',
  'session-store-mismatch': 'session',
  'store-closed': 'session',
  'order-locked': 'session',
  'cart-not-active': 'session',
  // The cart endpoint is throttling this guest, not refusing this item.
  'rate-limited': 'session',
  network: 'session',
  server: 'session',
  'sold-out': 'item',
  'not-found': 'item',
  invalid: 'item',
  // Not reachable from a cart command, but the table is exhaustive so that the
  // reason set and this decision cannot drift apart.
  'invalid-join-code': 'item',
  'assistant-unavailable': 'item',
  'assistant-conversation-full': 'item',
  // Deliberately `item`: an unclassified failure is not evidence that the rest
  // of the proposal would fail, and aborting on it would abandon rows that may
  // well succeed.
  unknown: 'item',
};

function isSessionFailure(failure: StoreFrontCommandFailure): boolean {
  return APPLY_FAILURE_SCOPE[failure.reason] === 'session';
}

export function createStoreFrontAiOrderingCommands(deps: {
  actions: StoreFrontAiOrderingActions;
  store: StoreFrontAiOrderingStore;
  cartCommands: StoreFrontCartCommands;
  sessionStore: GuestSessionStore;
  tenantStore: TenantStore;
}): StoreFrontAiOrderingCommands {
  const { actions, store, cartCommands, sessionStore, tenantStore } = deps;

  const invalidRequest: StoreFrontCommandFailure = {
    status: 'failed',
    message: tDefault(
      'guest.errors.invalidInput',
      'Something in the request was invalid. Please try again.',
    ),
    reason: 'invalid',
  };
  const missingSession: StoreFrontCommandFailure = {
    status: 'failed',
    message: '',
    reason: 'session-expired',
  };
  const mismatchedSession: StoreFrontCommandFailure = {
    status: 'failed',
    message: '',
    reason: 'session-store-mismatch',
  };

  function requireScopedToken(
    expectedStoreId: string,
  ): string | StoreFrontCommandFailure {
    if (tenantStore.getState().activeStoreId !== expectedStoreId) {
      return mismatchedSession;
    }
    const session = sessionStore.getState();
    if (!session.guestToken) return missingSession;
    if (session.storeId !== expectedStoreId) return mismatchedSession;
    return session.guestToken;
  }

  function hasScopedToken(storeId: string, token: string): boolean {
    return requireScopedToken(storeId) === token;
  }

  async function runCartOperation(
    expectedStoreId: string,
    operation: AiOrderingProposalRow['operation'],
  ) {
    const request = toAiOrderingCartRequest(operation);

    return request.kind === 'add'
      ? cartCommands.addItem(expectedStoreId, request.request)
      : request.kind === 'update'
        ? cartCommands.updateItem(
            expectedStoreId,
            request.itemId,
            request.request,
          )
        : cartCommands.removeItem(expectedStoreId, request.itemId);
  }

  let entrySequence = 0;

  function nextEntryId(role: string): string {
    entrySequence += 1;
    return `${role}-${String(entrySequence)}`;
  }

  return {
    dismissOperation(operationId) {
      actions.operationDismissed(operationId);
    },

    resetConversation() {
      actions.conversationCleared();
    },

    async loadConversation(expectedStoreId) {
      const state = store.getState();

      // Already read, or a read is in flight: either way there is nothing to do.
      // This is what lets the panel ask on every open without counting opens.
      if (state.isLoaded || state.isLoading) return { status: 'loaded' };

      const scoped = requireScopedToken(expectedStoreId);
      if (typeof scoped !== 'string') return scoped;
      const token = scoped;

      actions.transcriptLoadStarted();

      try {
        const turns = await storeFrontAiOrderingService.getConversation(token);

        // The guest may have switched store or session while this was in flight;
        // writing the transcript then would show one cart's conversation inside
        // another's.
        if (!hasScopedToken(expectedStoreId, token)) return mismatchedSession;

        actions.transcriptLoaded(turns);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapStoreFrontApiError(error);

        if (hasScopedToken(expectedStoreId, token)) {
          actions.transcriptLoadFailed(failure.message);
        }

        return failure;
      }
    },

    async sendMessage(expectedStoreId, input) {
      const scoped = requireScopedToken(expectedStoreId);
      if (typeof scoped !== 'string') return scoped;
      const token = scoped;

      // Read the open proposal's outcome BEFORE expiring it: a row the guest
      // never touched reports as `no_action`, and that distinction only exists
      // while the rows are still here.
      const previousOutcome = toAiOrderingPreviousOutcome(
        store.getState().proposal,
      );

      const request: SendAiOrderingMessageRequest = {
        message: input.message,
        ...(input.responseToPromptId !== undefined
          ? { responseToPromptId: input.responseToPromptId }
          : {}),
        ...(input.selectedOptionId !== undefined
          ? { selectedOptionId: input.selectedOptionId }
          : {}),
        ...(previousOutcome ? { previousOutcome } : {}),
      };

      const validation = sendAiOrderingMessageSchema.safeParse(request);
      if (!validation.success) return invalidRequest;
      const parsed = validation.data;

      actions.proposalExpired();
      actions.guestMessageAppended({
        id: nextEntryId('guest'),
        message: parsed.message,
      });
      actions.sendStarted();

      try {
        const turn = await storeFrontAiOrderingService.sendMessage(
          token,
          parsed,
        );
        if (!hasScopedToken(expectedStoreId, token)) return mismatchedSession;

        actions.turnAppended({ id: nextEntryId('assistant'), turn });
        return { status: 'sent', turn };
      } catch (error) {
        const failure = mapStoreFrontApiError(error);

        if (hasScopedToken(expectedStoreId, token)) {
          actions.sendFailed(failure.message);
        }

        return failure;
      }
    },

    async applyProposal(expectedStoreId) {
      const state = store.getState();
      const proposal = state.proposal;

      if (!proposal) return invalidRequest;

      // The guard, not the disabled button, is what makes this non-repeatable.
      // Row statuses are written only after the loop, so a second apply would
      // read the same pending rows and post every operation to the cart again.
      if (state.isApplying) return invalidRequest;

      const pending = proposal.rows.filter((row) => row.status === 'pending');

      if (pending.length === 0) return invalidRequest;

      const applied: { operationId: string; row: AiOrderingProposalRow }[] = [];
      let aborting: StoreFrontCommandFailure | null = null;

      actions.applyStarted();

      try {

        // In the proposal's own order: the assistant may have written the rows to
        // read as a sequence, and the guest sees them in that order.
        for (const row of pending) {
          if (aborting) break;

          const result = await runCartOperation(expectedStoreId, row.operation);

          if (result.status === 'updated') {
            applied.push({
              operationId: row.operation.operationId,
              row: { operation: row.operation, status: 'applied' },
            });
            continue;
          }

          applied.push({
            operationId: row.operation.operationId,
            row: {
              operation: row.operation,
              status: 'failed',
              failureCode: result.reason,
            },
          });

          // An item-specific refusal says nothing about the other rows, so the
          // loop carries on and the guest gets one complete report instead of a
          // half-applied proposal they have to re-ask about.
          if (isSessionFailure(result)) {
            aborting = result;
          }
        }

        actions.proposalApplied(applied);

        if (aborting) return aborting;

        return {
          status: 'applied',
          results: applied.map(({ operationId, row }) => ({
            operationId,
            outcome: row.status === 'applied' ? 'accepted' : 'failed',
            ...(row.failureCode !== undefined
              ? { failureCode: row.failureCode }
              : {}),
          })),
        };
      } finally {
        // Every exit clears it: a returned failure, an abort, and a thrown error
        // from a cart command. An overlay left on screen with nothing in flight
        // is worse than no overlay at all.
        actions.applyFinished();
      }
    },

    async retryOperation(expectedStoreId, operationId) {
      const proposal = store.getState().proposal;
      if (!proposal) return invalidRequest;

      const row = proposal.rows.find(
        (candidate) => candidate.operation.operationId === operationId,
      );

      // Only a settled failure is retryable: a pending row belongs to the apply
      // flow, and a row already retrying would double-post the same operation.
      if (!row || row.status !== 'failed' || row.isRetrying === true) {
        return invalidRequest;
      }

      actions.operationRetryStarted(operationId);

      const result = await runCartOperation(expectedStoreId, row.operation);

      if (result.status === 'updated') {
        actions.operationRetried({
          operationId,
          row: { operation: row.operation, status: 'applied' },
        });

        return {
          status: 'applied',
          results: [{ operationId, outcome: 'accepted' }],
        };
      }

      actions.operationRetried({
        operationId,
        row: {
          operation: row.operation,
          status: 'failed',
          failureCode: result.reason,
        },
      });

      // A session-scoped failure is about the page, not this row, so it is
      // returned for the caller to surface. An item-scoped one is already fully
      // described by the row the guest is looking at, and returning it would
      // put the same thing on screen twice.
      if (isSessionFailure(result)) return result;

      return {
        status: 'applied',
        results: [
          { operationId, outcome: 'failed', failureCode: result.reason },
        ],
      };
    },
  };
}
