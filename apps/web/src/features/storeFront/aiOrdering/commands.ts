import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { tDefault } from '@/app/i18n';
import { sendAiOrderingMessageSchema } from '@/models/aiOrdering';
import { toAiOrderingCartRequest } from '@/models/aiOrdering';
import { storeFrontAiOrderingService } from '@/services/storeFrontAiOrdering.service';
import {
  mapStoreFrontApiError,
  type StoreFrontCommandFailure,
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

export type StoreFrontAiOrderingCommands = {
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
  dismissOperation(operationId: string): void;
  resetConversation(): void;
};

/**
 * A session-level failure means every remaining call would fail the same way, so
 * the apply loop stops rather than spending more requests proving it.
 */
function isSessionFailure(failure: StoreFrontCommandFailure): boolean {
  return (
    failure.reason === 'session-expired' ||
    failure.reason === 'session-store-mismatch'
  );
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
      const proposal = store.getState().proposal;

      if (!proposal) return invalidRequest;

      const pending = proposal.rows.filter((row) => row.status === 'pending');

      if (pending.length === 0) return invalidRequest;

      const applied: { operationId: string; row: AiOrderingProposalRow }[] = [];
      let aborting: StoreFrontCommandFailure | null = null;

      // In the proposal's own order: the assistant may have written the rows to
      // read as a sequence, and the guest sees them in that order.
      for (const row of pending) {
        if (aborting) break;

        const request = toAiOrderingCartRequest(row.operation);
        const result =
          request.kind === 'add'
            ? await cartCommands.addItem(expectedStoreId, request.request)
            : request.kind === 'update'
              ? await cartCommands.updateItem(
                  expectedStoreId,
                  request.itemId,
                  request.request,
                )
              : await cartCommands.removeItem(expectedStoreId, request.itemId);

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
    },
  };
}
