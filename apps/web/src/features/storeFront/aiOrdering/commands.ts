import type { GuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { tDefault } from '@/app/i18n';
import { sendAiOrderingMessageSchema } from '@/models/aiOrdering';
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
import type { StoreFrontAiOrderingStore } from './store';
import type { StoreFrontCartActions } from '../cart/actions';
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
  /**
   * Sends the guest's decision: the rows they kept, by id.
   *
   * One request, not a loop. The backend executes what it proposed and reports
   * a result for every operation, so there is no client-side ordering, failure
   * classification, or partial state to reconcile here.
   */
  applyProposal(expectedStoreId: string): Promise<AiOrderingApplyResult>;
  dismissOperation(operationId: string): void;
  /**
   * Records the guest's answer to one choice on the open proposal, whether it
   * fills a choice that was open or changes one that already had an answer.
   *
   * Synchronous and requestless on purpose: the options came down with the
   * proposal, so answering is local until the guest applies. It is a command
   * rather than a bare action because the panel is a view and views do not
   * reach actions.
   */
  answerProposalChoice(input: {
    operationId: string;
    modifierId: string;
    optionIds: string[];
  }): void;
};

export function createStoreFrontAiOrderingCommands(deps: {
  actions: StoreFrontAiOrderingActions;
  store: StoreFrontAiOrderingStore;
  cartActions: StoreFrontCartActions;
  sessionStore: GuestSessionStore;
  tenantStore: TenantStore;
}): StoreFrontAiOrderingCommands {
  const { actions, store, cartActions, sessionStore, tenantStore } = deps;

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

    answerProposalChoice(input) {
      actions.proposalChoiceAnswered(input);
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

      const request: SendAiOrderingMessageRequest = {
        message: input.message,
        ...(input.responseToPromptId !== undefined
          ? { responseToPromptId: input.responseToPromptId }
          : {}),
        ...(input.selectedOptionId !== undefined
          ? { selectedOptionId: input.selectedOptionId }
          : {}),
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
      // The backend refuses a second decision too, but a client that sends one
      // would show the guest a conflict error for pressing a live button.
      if (state.isApplying) return invalidRequest;

      const keptOperationIds = proposal.rows
        .filter((row) => row.status === 'pending')
        .map((row) => row.operation.operationId);

      if (keptOperationIds.length === 0) return invalidRequest;

      const kept = new Set(keptOperationIds);
      // Only the answers that belong to a row still being applied: a dismissed
      // row's answer is not part of this decision, and the server refuses an
      // answer for an operation it is not executing.
      //
      // An empty answer is sent too. An answer replaces what was selected, so
      // "none" is how the guest takes back an optional extra the assistant
      // added; dropping it here would silently keep the extra.
      const resolvedChoices = Object.entries(proposal.choiceAnswers)
        .filter(([operationId]) => kept.has(operationId))
        .flatMap(([operationId, byModifier]) =>
          Object.entries(byModifier).map(([modifierId, optionIds]) => ({
            operationId,
            modifierId,
            optionIds,
          })),
        );

      const scoped = requireScopedToken(expectedStoreId);
      if (typeof scoped !== 'string') return scoped;
      const token = scoped;

      actions.applyStarted();

      try {
        const decision = await storeFrontAiOrderingService.decideProposal(
          token,
          {
            proposalId: proposal.proposalId,
            keptOperationIds,
            ...(resolvedChoices.length > 0 ? { resolvedChoices } : {}),
          },
        );

        if (!hasScopedToken(expectedStoreId, token)) return mismatchedSession;

        actions.proposalDecided(decision.results);
        // The response carries the cart the server produced, so the surface
        // unblocks on a confirmed cart rather than on a second read.
        cartActions.cartUpdated(decision.cart);

        return { status: 'applied', results: decision.results };
      } catch (error) {
        const failure = mapStoreFrontApiError(error);

        // Nothing executed, so the rows keep their pending status and the guest
        // can answer the proposal again — unless the backend says it was already
        // decided, which the caller surfaces as its own message.
        return failure;
      } finally {
        // Every exit clears it: a failure, a mismatched session, and a thrown
        // error. An overlay left on screen with nothing in flight is worse than
        // no overlay at all.
        actions.applyFinished();
      }
    },
  };
}
