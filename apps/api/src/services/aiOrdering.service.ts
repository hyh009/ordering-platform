import { randomUUID } from 'node:crypto';

import { Command } from '@langchain/langgraph';
import {
  toAiOrderingAppliedSummaries,
  toAiOrderingGuestConversationDto,
} from '@src/models/aiOrdering/mapper';
import {
  AI_ORDERING_MAX_TURNS_PER_CONVERSATION,
  readAiOrderingAppliedOperations,
} from '@src/models/aiOrdering/model';
import {
  AI_ORDERING_PROPOSAL_TOOL,
  aiOrderingVersionFingerprint,
  buildAiOrderingContext,
  buildAiOrderingOperationLabel,
  buildAiOrderingPromptPrelude,
  buildAiOrderingSupersededResults,
  createAiOrderingAgent,
  createAiOrderingDebugTrace,
  createRedisAiOrderingRateLimiter,
  generateAiOrderingSummary,
  getAiOrderingCheckpointer,
  mapAiOrderingProviderFailure,
  planAiOrderingSummarization,
  readAiOrderingEarlierProposals,
  readAiOrderingLastProposal,
  resolveAiOrderingConfirmationRequired,
  resolveAiOrderingProposalChoices,
  resolveAiOrderingPrompt,
  resolveAiOrderingRuntime,
  windowAiOrderingHistory,
} from '@src/modules/aiOrdering';
import { aiOrderingRepository } from '@src/repositories/aiOrdering/repository';
import { storeRepository } from '@src/repositories/store/repository';
import { guestOrderingService } from '@src/services/guestOrdering.service';
import { publicStoreService } from '@src/services/publicStore.service';
import { ERROR_CODES } from '@src/utils/errorCode.js';
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  TooManyRequestsError,
} from '@src/utils/errors';
import { logger } from '@src/utils/logger';

import type { BaseCheckpointSaver } from '@langchain/langgraph';
import type {
  AiOrderingGuestConversationDto,
  AiOrderingOperation,
  AiOrderingOperationResult,
  AiOrderingSettledProposal,
  AiOrderingProposalDecisionData,
  AiOrderingTurnResponseData,
  CartDto,
  CartItemInput,
  DecideAiOrderingProposalRequest,
  PublicMenuDto,
  SendAiOrderingMessageRequest,
  SupportedLocale,
  UpdateCartItemRequest,
} from '@repo/shared';
import type {
  AiOrderingConversationEntity,
  AiOrderingPromptPrelude,
  AiOrderingTurnSnapshot,
} from '@src/models/aiOrdering/model';
import type { StoreEntity } from '@src/models/store/model';
import type {
  AiOrderingRateLimiter,
  AiOrderingRunRecord,
  AiOrderingRuntime,
} from '@src/modules/aiOrdering';
import type {
  AiOrderingRepository,
  AiOrderingStoredProposal,
} from '@src/repositories/aiOrdering/repository';
import type { GuestTokenClaims } from '@src/services/guestToken.service';

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
/**
 * How long the in-flight lock survives with no explicit release.
 *
 * Set well above the turn budget on purpose, and the two numbers are related:
 * because a turn is hard-capped at `maxTurnDurationMs`, the request that took the
 * lock always releases it, so this expiry only ever fires after a process died
 * mid-turn.
 *
 * Being generous here is the safer error. A lock that expires mid-turn lets a
 * second request through and defeats the concurrency guard — it costs money. A
 * lock left behind by a crash costs one guest a wait.
 */
const IN_FLIGHT_LOCK_TTL_MS = 180_000;

export type AiOrderingServiceDeps = {
  conversations: AiOrderingRepository;
  findStore: (storeId: string) => Promise<StoreEntity | null>;
  getPublicMenu: (storeId: string) => Promise<PublicMenuDto>;
  getGuestCart: (claims: GuestTokenClaims) => Promise<CartDto>;
  addCartItem: (
    claims: GuestTokenClaims,
    request: CartItemInput,
  ) => Promise<unknown>;
  updateCartItem: (
    claims: GuestTokenClaims,
    itemId: string,
    request: UpdateCartItemRequest,
  ) => Promise<unknown>;
  removeCartItem: (
    claims: GuestTokenClaims,
    itemId: string,
  ) => Promise<unknown>;
  resolveRuntime: () => AiOrderingRuntime | null;
  /**
   * The paused-run store. Injectable like every other dependency so a unit test
   * can hand the service an in-memory one and never open a second Mongo pool.
   */
  getCheckpointer: () => Promise<BaseCheckpointSaver>;
  rateLimiter: AiOrderingRateLimiter;
  newId: (prefix: string) => string;
  now: () => Date;
};

/**
 * API-facing AI ordering use case.
 *
 * Every dependency is injectable so the service can be unit tested without a
 * database, a Redis connection, or a provider: the module pieces it orchestrates
 * are all pure or stubbable, which is the whole reason they were split that way.
 *
 * This service plans a reply. It never mutates the cart — the guest applies an
 * accepted proposal through the existing cart API, which keeps cart validation,
 * concurrency, and SSE behavior in exactly one place.
 */
export class AiOrderingService {
  constructor(private readonly deps: AiOrderingServiceDeps) {}

  public async sendMessage(
    claims: GuestTokenClaims,
    request: SendAiOrderingMessageRequest,
  ): Promise<AiOrderingTurnResponseData> {
    const runtime = this.deps.resolveRuntime();

    if (!runtime) {
      throw new NotFoundError(
        'The ordering assistant is not enabled for this deployment.',
        ERROR_CODES.AI_ORDERING_DISABLED,
      );
    }

    const limitKey = `${claims.storeId}:${claims.cartId}:${claims.participantId}`;
    const limit = await this.deps.rateLimiter.acquire(limitKey);

    if (!limit.allowed) {
      // Refused before the model is ever called: a cost guard that spends money
      // deciding not to spend money is not a guard.
      throw new TooManyRequestsError(
        limit.reason === 'concurrent'
          ? 'A previous assistant request is still in progress.'
          : 'Too many assistant requests. Try again shortly.',
      );
    }

    // Wall-clock, not the injected `now`: this bounds elapsed real time, while
    // `now` exists to make stored turn timestamps deterministic.
    const deadlineAt = Date.now() + runtime.config.maxTurnDurationMs;

    try {
      return await this.withTurnDeadline(claims, runtime, () =>
        this.planTurn(claims, request, runtime, deadlineAt),
      );
    } finally {
      await this.deps.rateLimiter.release(limitKey);
    }
  }

  /**
   * The guest's decision on a pending proposal — the only path that changes the
   * cart from the assistant.
   *
   * The guest sends ids, never operations. What executes is rebuilt from the
   * proposal the backend recorded, so a caller can neither add an operation the
   * assistant never proposed nor alter one it did.
   *
   * The decision is CLAIMED before anything runs. That claim is the single-use
   * guarantee, and it has to come first: executing and then recording would let
   * two in-flight acceptances both apply before either had written anything.
   */
  public async decideProposal(
    claims: GuestTokenClaims,
    request: DecideAiOrderingProposalRequest,
  ): Promise<AiOrderingProposalDecisionData> {
    const runtime = this.deps.resolveRuntime();

    if (!runtime) {
      throw new NotFoundError(
        'The ordering assistant is not enabled for this deployment.',
        ERROR_CODES.AI_ORDERING_DISABLED,
      );
    }

    const lookup = {
      storeId: claims.storeId,
      cartId: claims.cartId,
      participantId: claims.participantId,
    };

    const limitKey = `${claims.storeId}:${claims.cartId}:${claims.participantId}`;
    const limit = await this.deps.rateLimiter.acquire(limitKey);

    if (!limit.allowed) {
      throw new TooManyRequestsError(
        limit.reason === 'concurrent'
          ? 'A previous assistant request is still in progress.'
          : 'Too many assistant requests. Try again shortly.',
      );
    }

    try {
      return await this.runDecision(claims, request, runtime, lookup);
    } finally {
      await this.deps.rateLimiter.release(limitKey);
    }
  }

  private async runDecision(
    claims: GuestTokenClaims,
    request: DecideAiOrderingProposalRequest,
    runtime: AiOrderingRuntime,
    lookup: { storeId: string; cartId: string; participantId: string },
  ): Promise<AiOrderingProposalDecisionData> {
    const claim = await this.deps.conversations.recordProposalDecision({
      ...lookup,
      proposalId: request.proposalId,
      // Results are filled in after execution. Claiming settles WHO decides;
      // this record settles THAT it was decided, which is what must be atomic.
      decision: { decidedAt: this.deps.now(), results: [] },
    });

    if (!claim.claimed) {
      if (!claim.proposal) {
        throw new NotFoundError(
          'That proposal is no longer available.',
          ERROR_CODES.AI_ORDERING_PROPOSAL_NOT_FOUND,
        );
      }

      if (claim.proposal.snapshot.decision?.superseded) {
        // Settled by the guest's own next message, not by them answering it.
        // Reported as expiry, which is what it is: the offer lapsed when the
        // conversation moved past it. Telling them they "already answered"
        // would be the same class of lie this guards against below.
        throw new ConflictError(
          'That proposal is no longer available to apply.',
          ERROR_CODES.AI_ORDERING_PROPOSAL_EXPIRED,
        );
      }

      // Already answered. Distinct from expiry on purpose: telling a guest who
      // double-submitted that their proposal expired is a different lie from
      // telling a guest who waited that they already acted.
      throw new ConflictError(
        'That proposal has already been answered.',
        ERROR_CODES.AI_ORDERING_PROPOSAL_ALREADY_DECIDED,
      );
    }

    const proposal = claim.proposal;

    if (!proposal) {
      throw new NotFoundError(
        'That proposal is no longer available.',
        ERROR_CODES.AI_ORDERING_PROPOSAL_NOT_FOUND,
      );
    }

    const kept = new Set(request.keptOperationIds);
    const resolution = resolveAiOrderingProposalChoices(
      proposal.snapshot.operations.filter((operation) =>
        kept.has(operation.operationId),
      ),
      request.resolvedChoices ?? [],
    );

    if (!resolution.ok) {
      // The card blocks the button, so reaching this means the request did not
      // come from the card. Reported as a bad request rather than executed
      // partially: an item must not land in the cart missing a choice its
      // product requires.
      throw new BadRequestError(
        'That proposal cannot be applied as answered.',
        ERROR_CODES.AI_ORDERING_PROPOSAL_CHOICE_INVALID,
      );
    }

    // What the guest changed, described again: the summary on a proposed
    // operation names the options the assistant chose, and it is read by the
    // model on the resumed run and by everything that reads the record later.
    const appliedOperations = await this.describeAdjustedOperations(
      claims,
      resolution.operations.filter((operation) =>
        resolution.adjustedOperationIds.includes(operation.operationId),
      ),
      request.locale,
    );
    const keptOperations = resolution.operations.map(
      (operation) =>
        appliedOperations.find(
          (applied) => applied.operationId === operation.operationId,
        ) ?? operation,
    );
    const dismissed: AiOrderingOperationResult[] = proposal.snapshot.operations
      .filter((operation) => !kept.has(operation.operationId))
      .map((operation) => ({
        operationId: operation.operationId,
        outcome: 'rejected' as const,
      }));

    if (keptOperations.length === 0) {
      // Nothing to run, so no cart call and no model call. The proposal is
      // resolved and the paused run is simply left to expire.
      await this.deps.conversations.setProposalResults({
        ...lookup,
        proposalId: request.proposalId,
        results: dismissed,
      });

      return {
        proposalId: request.proposalId,
        results: dismissed,
        cart: await this.deps.getGuestCart(claims),
      };
    }

    const resumed = await this.resumeProposal({
      claims,
      runtime,
      proposalId: request.proposalId,
      proposal,
      keptOperations,
      // Reported to the model, never executed. The resume edits the pending
      // call down to the kept operations, so this is the only thing that tells
      // the assistant the guest took a row out.
      dismissedOperationIds: dismissed.map((result) => result.operationId),
    });

    const results = this.orderResults(proposal.snapshot.operations, [
      ...(resumed.results ?? []),
      ...dismissed,
    ]);

    await this.deps.conversations.setProposalResults({
      ...lookup,
      proposalId: request.proposalId,
      results,
      // Beside the proposed operations, never over them: what the assistant
      // proposed stays on record as it was. Only when something differs, so an
      // unchanged decision is stored exactly as it always was.
      ...(appliedOperations.length > 0 ? { appliedOperations } : {}),
      // Stored, not only returned: the guest reads it, and a reload would
      // otherwise keep the per-operation outcomes and lose the explanation.
      ...(resumed.reply !== undefined ? { reply: resumed.reply } : {}),
    });

    return {
      proposalId: request.proposalId,
      results,
      // So the record the panel keeps names what was applied without a reload.
      ...(appliedOperations.length > 0
        ? {
            appliedSummaries: toAiOrderingAppliedSummaries({
              operations: appliedOperations,
              adjustedOperationIds: resolution.adjustedOperationIds,
            }),
          }
        : {}),
      cart: await this.deps.getGuestCart(claims),
      ...(resumed.reply !== undefined ? { reply: resumed.reply } : {}),
    };
  }

  /**
   * Rewrites the summary of each operation the guest changed, so it names the
   * options that were applied rather than the ones that were proposed.
   *
   * Built by the same function that labelled the proposal, from the menu and
   * the cart as they are BEFORE anything executes — an update is named after
   * the cart item it touches, which has to still be there to be named.
   *
   * Reads nothing when the guest changed nothing, which is most decisions.
   */
  private async describeAdjustedOperations(
    claims: GuestTokenClaims,
    adjusted: AiOrderingOperation[],
    guestLocale: SupportedLocale | undefined,
  ): Promise<AiOrderingOperation[]> {
    if (adjusted.length === 0) {
      return [];
    }

    const [store, menu, cart] = await Promise.all([
      this.deps.findStore(claims.storeId),
      this.deps.getPublicMenu(claims.storeId),
      this.deps.getGuestCart(claims),
    ]);

    if (!store) {
      throw new NotFoundError('Store not found', ERROR_CODES.STORE_NOT_FOUND);
    }

    return adjusted.map((operation) => ({
      ...operation,
      summary: buildAiOrderingOperationLabel(operation, {
        menu,
        cart,
        locale: guestLocale ?? store.locale.defaultLocale,
      }),
    }));
  }

  /**
   * Results in the order the operations were proposed.
   *
   * The guest reads them beside the rows they accepted, so "the second one
   * failed" has to mean the second row.
   */
  private orderResults(
    operations: AiOrderingOperation[],
    results: AiOrderingOperationResult[],
  ): AiOrderingOperationResult[] {
    const byId = new Map(results.map((result) => [result.operationId, result]));

    return operations.map(
      (operation) =>
        byId.get(operation.operationId) ?? {
          operationId: operation.operationId,
          outcome: 'no_action' as const,
        },
    );
  }

  /**
   * Resumes the paused run with the guest's edit, which executes the kept
   * operations and lets the model answer what happened in the same exchange.
   *
   * A proposal whose run is gone has expired: the checkpoint's lifetime IS the
   * proposal's lifetime. Nothing is executed in that case.
   */
  private async resumeProposal(input: {
    claims: GuestTokenClaims;
    runtime: AiOrderingRuntime;
    proposalId: string;
    proposal: AiOrderingStoredProposal;
    keptOperations: AiOrderingOperation[];
    dismissedOperationIds: string[];
  }): Promise<{ results: AiOrderingOperationResult[] | null; reply?: string }> {
    const { agent, record } = createAiOrderingAgent({
      config: input.runtime.config,
      // The paused run carries its own context; these are only needed to build
      // the same agent shape, never to plan again.
      context: { versionId: input.runtime.config.versionId, blocks: [] },
      validation: {
        menu: { groups: [], modifiers: [] } as unknown as PublicMenuDto,
        cart: { items: [] } as unknown as CartDto,
        participantId: input.claims.participantId,
      },
      confirmationRequired: true,
      // Unused on a resume: the labels were written when the proposal was made.
      locale: 'zh-TW',
      guestMessage: '',
      onModelCall: createAiOrderingDebugTrace(`accept-${input.proposalId}`),
      newId: this.deps.newId,
      toToolSchema: (schema) => input.runtime.toToolSchema(schema),
      model: input.runtime.createChatModel(),
      checkpointer: await this.deps.getCheckpointer(),
      executor: this.createCartExecutor(input.claims),
      dismissedOperationIds: input.dismissedOperationIds,
    });

    const config = { configurable: { thread_id: input.proposalId } };
    // A paused run has a pending task waiting on the interrupt. No task means
    // the checkpoint is gone, which is what expiry looks like from here.
    const state = (await agent.getState(config)) as unknown as {
      tasks?: unknown[];
    };

    if ((state.tasks?.length ?? 0) === 0) {
      throw new ConflictError(
        'That proposal is no longer available to apply.',
        ERROR_CODES.AI_ORDERING_PROPOSAL_EXPIRED,
      );
    }

    const resume = new Command({
      resume: {
        decisions: [
          {
            type: 'edit',
            editedAction: {
              name: AI_ORDERING_PROPOSAL_TOOL,
              // The WHOLE call, rebuilt from the stored proposal with only
              // the kept operations. A partial set of arguments is rejected
              // by the interrupt without a word, and the tool never runs.
              args: {
                ...input.proposal.response,
                operations: input.keptOperations,
              },
            },
          },
        ],
      },
    });

    /**
     * One invoke, two halves: the tool body writes the cart, and the model is
     * then called once more to say what happened.
     *
     * Only the first half is the decision. The second produces the sentence the
     * guest reads, which makes losing it a real loss — and makes losing the
     * recorded decision along with it a worse one. Letting a failure here fail
     * the request cost a guest their cart change ON RECORD: the proposal was
     * already claimed, the results were never written, and the next turn would
     * have been told nothing was applied while the items sat in the cart.
     *
     * `record.results` is what tells the halves apart. The tool body sets it
     * before it returns, so a non-null value means the cart was written and
     * whatever threw came after it. Null means nothing executed, and that is a
     * real failure the guest has to be told about.
     */
    try {
      const result = await agent.invoke(resume, config);
      const last = result.messages?.at(-1);
      // Only the model's own words. No decided run ends at the tool any more,
      // so this no longer carries a case — but a run that did would leave the
      // tool's result last, and that is a line of `operationId: outcome`
      // written for the model, not for the guest.
      const reply =
        last?.getType() === 'ai' && typeof last.content === 'string'
          ? last.content
          : undefined;

      return {
        results: record.results,
        ...(reply !== undefined && reply.length > 0 ? { reply } : {}),
      };
    } catch (error) {
      if (record.results === null) {
        throw error;
      }

      // Never silent: the cart changed and the assistant went quiet, which is
      // invisible from the outside precisely because the request now succeeds.
      logger.error(
        { err: error, proposalId: input.proposalId },
        'ai ordering closing call failed after the cart was written',
      );

      return { results: record.results };
    }
  }

  /**
   * The guest's own transcript, for a panel that is reopening.
   *
   * Three things this deliberately does NOT do, each for the same reason — a read
   * of what the guest already said is not a turn:
   *
   * - it does not resolve the runtime, so the transcript is still readable after
   *   the assistant is switched off or its provider credentials are pulled;
   * - it does not take the rate limiter, so reopening the panel cannot consume a
   *   guest's budget for actually talking to the assistant;
   * - it does not require an open store, so a guest can read back what they
   *   discussed after the store closed.
   */
  public async getConversation(
    claims: GuestTokenClaims,
  ): Promise<AiOrderingGuestConversationDto> {
    const conversation = await this.deps.conversations.findByParticipant({
      storeId: claims.storeId,
      cartId: claims.cartId,
      participantId: claims.participantId,
    });

    // The participant id is part of the lookup, so a guest can only ever read
    // their own side of a shared cart. There is no filtering step to get wrong.
    return toAiOrderingGuestConversationDto(conversation);
  }

  /**
   * Caps one turn at the version's budget.
   *
   * The per-call provider timeouts do not bound a turn on their own: the database
   * reads, the menu fetch, and the persistence write all sit outside them. This is
   * what makes the turn's duration an actual guarantee, which is what lets the
   * in-flight lock's expiry be set generously.
   *
   * When the deadline wins, the work already in flight is not cancelled — a race
   * cannot do that. It does stop quickly, because every provider call's own
   * timeout is also clamped to what is left of this budget. What matters here is
   * that the caller returns, so the `finally` above releases the lock on time.
   */
  private async withTurnDeadline<T>(
    claims: GuestTokenClaims,
    runtime: AiOrderingRuntime,
    work: () => Promise<T>,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        work(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            logger.error(
              {
                storeId: claims.storeId,
                cartId: claims.cartId,
                participantId: claims.participantId,
                budgetMs: runtime.config.maxTurnDurationMs,
              },
              'AI ordering turn exceeded its budget',
            );

            reject(
              new InternalServerError(
                'The ordering assistant took too long to answer.',
                ERROR_CODES.AI_ORDERING_UNAVAILABLE,
              ),
            );
          }, runtime.config.maxTurnDurationMs);
        }),
      ]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }

  /**
   * Settles the previous proposal if the guest never answered it, and returns
   * what the model should be told about it.
   *
   * A proposal is good for the turn that made it. Without this, an unanswered
   * proposal stayed applicable for as long as its checkpoint lived — a guest
   * could keep talking for ten turns and then accept an offer made against a
   * cart and a menu that had both moved on.
   *
   * Settling it here rather than when the turn is appended is deliberate: the
   * model needs the outcome in THIS turn's context, the one where the guest
   * typed instead of accepting. Without it, "you never answered" and "I never
   * offered" look identical to the model while its own reply still sits in the
   * history saying it added something — which is how it ends up inventing a
   * cart item id for an item that was never added.
   *
   * The write reuses the same conditional claim an acceptance uses, so a guest
   * who presses accept at the very moment they send a message cannot have both:
   * exactly one of the two writes matches `decision: { $exists: false }`, and
   * if the acceptance wins, its results are what the model is told.
   */
  private async settleLastProposal(
    lookup: { storeId: string; cartId: string; participantId: string },
    conversation: AiOrderingConversationEntity | null,
  ): Promise<{
    results: AiOrderingOperationResult[];
    /**
     * What that proposal did, so the model can read each result: the operations
     * as applied, which differ from the proposed ones where the guest changed a
     * choice before accepting.
     */
    operations: AiOrderingOperation[];
    /** Which of those the guest changed. */
    adjustedOperationIds: string[];
    /** Which turn proposed it. Absent when there was no proposal to settle. */
    turnNumber?: number;
    settledProposal?: AiOrderingSettledProposal;
  }> {
    const last = readAiOrderingLastProposal(conversation);

    if (!last) {
      return { results: [], operations: [], adjustedOperationIds: [] };
    }

    const { turnNumber, proposal } = last;
    const { operations } = proposal;

    if (proposal.decision) {
      return {
        results: proposal.decision.results,
        ...readAiOrderingAppliedOperations(proposal),
        turnNumber,
      };
    }

    const results = buildAiOrderingSupersededResults(proposal);

    const claim = await this.deps.conversations.recordProposalDecision({
      ...lookup,
      proposalId: proposal.proposalId,
      decision: { decidedAt: this.deps.now(), results, superseded: true },
    });

    if (claim.claimed) {
      // Reported to the caller as well as to the model. The panel is still
      // showing those rows with no verdict, and it has no other way to learn
      // this: nothing happened on the client, the guest simply typed instead.
      return {
        results,
        operations,
        adjustedOperationIds: [],
        turnNumber,
        settledProposal: { proposalId: proposal.proposalId, results },
      };
    }

    // The acceptance won. Its own results are authoritative, and they may still
    // be empty for the instant between claiming and recording what executed.
    // Not reported back: the client made that decision and already has them.
    return {
      results: claim.proposal?.snapshot.decision?.results ?? [],
      // The applied operations are written with the results, so in that same
      // instant these are still the proposed ones.
      ...(claim.proposal?.snapshot.decision
        ? readAiOrderingAppliedOperations({
            ...proposal,
            decision: claim.proposal.snapshot.decision,
          })
        : { operations, adjustedOperationIds: [] }),
      turnNumber,
    };
  }

  private async planTurn(
    claims: GuestTokenClaims,
    request: SendAiOrderingMessageRequest,
    runtime: AiOrderingRuntime,
    deadlineAt: number,
  ): Promise<AiOrderingTurnResponseData> {
    const lookup = {
      storeId: claims.storeId,
      cartId: claims.cartId,
      participantId: claims.participantId,
    };

    // Loaded exactly once per turn: prompt resolution, outcome matching, history
    // windowing, and persistence all read this same value.
    const conversation =
      await this.deps.conversations.findByParticipant(lookup);

    if (
      conversation &&
      conversation.turns.length >= AI_ORDERING_MAX_TURNS_PER_CONVERSATION
    ) {
      throw new TooManyRequestsError(
        'This conversation has reached its limit.',
        ERROR_CODES.AI_ORDERING_CONVERSATION_FULL,
      );
    }

    const prompt = resolveAiOrderingPrompt(conversation, request);

    if (!prompt.ok) {
      // Resolved against this guest's own conversation, so another guest's
      // prompt id simply is not found rather than being rejected by a check.
      throw new BadRequestError(
        'That question is no longer available to answer.',
        ERROR_CODES.AI_ORDERING_PROMPT_NOT_FOUND,
      );
    }

    // What the backend recorded when it executed, not what a client claims.
    // Settling an unanswered proposal here is what makes it one turn's offer.
    const settled = await this.settleLastProposal(lookup, conversation);
    const previousResults = settled.results;

    const [store, menu, cart] = await Promise.all([
      this.deps.findStore(claims.storeId),
      this.deps.getPublicMenu(claims.storeId),
      this.deps.getGuestCart(claims),
    ]);

    if (!store) {
      throw new NotFoundError('Store not found', ERROR_CODES.STORE_NOT_FOUND);
    }

    const confirmationRequired = resolveAiOrderingConfirmationRequired({
      versionPermitsAutomaticApplication:
        runtime.config.permitsAutomaticApplication,
      ...(store.assistant !== undefined
        ? {
            storeAutoApplyCartOperations:
              store.assistant.autoApplyCartOperations,
          }
        : {}),
    });

    const historyWindow = windowAiOrderingHistory(
      conversation,
      runtime.config.maxHistoryTurns,
    );

    const context = buildAiOrderingContext({
      config: runtime.config,
      locale: store.locale.defaultLocale,
      storeName:
        store.profile.displayName[store.locale.defaultLocale] ?? store.id,
      menu,
      cart,
      participantId: claims.participantId,
      message: request.message,
      history: historyWindow.history,
      ...(historyWindow.summary !== undefined
        ? { summary: historyWindow.summary }
        : {}),
      ...(prompt.resolvedPrompt !== undefined
        ? { resolvedPrompt: prompt.resolvedPrompt }
        : {}),
      // One log, oldest first, ending with the proposal just settled — so every
      // change the model made carries the turn it was made on.
      proposalLog: [
        ...readAiOrderingEarlierProposals(conversation),
        ...(settled.turnNumber !== undefined
          ? [
              {
                turnNumber: settled.turnNumber,
                operations: settled.operations,
                adjustedOperationIds: settled.adjustedOperationIds,
                results: previousResults,
              },
            ]
          : []),
      ],
    });

    // The proposal id is generated BEFORE the run so it can be the run's thread
    // id. That is what makes a proposal resumable by the one identifier the
    // guest comes back with, and what scopes the checkpoint's lifetime to the
    // proposal's own. It is simply unused when the model does not propose.
    const proposalId = this.deps.newId('proposal');

    const { agent, record, messages } = createAiOrderingAgent({
      config: runtime.config,
      context,
      validation: { menu, cart, participantId: claims.participantId },
      confirmationRequired,
      // The labels follow the guest's interface. The menu the model reads above
      // stays in the store's default locale.
      locale: request.locale ?? store.locale.defaultLocale,
      guestMessage: request.message,
      onModelCall: createAiOrderingDebugTrace(`turn-${proposalId}`),
      newId: (prefix) =>
        prefix === 'proposal' ? proposalId : this.deps.newId(prefix),
      toToolSchema: (schema) => runtime.toToolSchema(schema),
      model: runtime.createChatModel(),
      checkpointer: await this.deps.getCheckpointer(),
      deadlineAt,
      // Never called during planning: the run pauses before the tool body. It is
      // supplied anyway because the same tool definition serves both phases.
      executor: this.createCartExecutor(claims),
    });

    try {
      await agent.invoke(
        { messages },
        { configurable: { thread_id: proposalId } },
      );
    } catch (error) {
      // Provider errors carry prompt fragments and internal identifiers: the
      // real one goes to the log, a stable reason goes no further.
      const reason = mapAiOrderingProviderFailure(error);

      logger.error(
        { err: error, ...lookup, reason },
        'AI ordering provider call failed',
      );

      throw new InternalServerError(
        'The ordering assistant is unavailable right now.',
        ERROR_CODES.AI_ORDERING_UNAVAILABLE,
      );
    }

    if (!record.response) {
      // Nothing usable came back on any attempt. There is no response the guest
      // saw, so there is no turn to store; the raw output is logged instead.
      logger.error(
        {
          ...lookup,
          detail: record.rejectionDetail,
          modelOutput: record.modelOutput,
        },
        'AI ordering model output was unusable after every repair attempt',
      );

      throw new InternalServerError(
        'The ordering assistant could not answer that.',
        ERROR_CODES.AI_ORDERING_UNAVAILABLE,
      );
    }

    const prelude = buildAiOrderingPromptPrelude({
      context,
      toToolSchema: (schema) => runtime.toToolSchema(schema),
      now: new Date(),
    });
    const blockText = (kind: string) =>
      context.blocks.find((block) => block.kind === kind)?.text ?? '';

    const turn = this.buildTurn({
      request,
      runtime,
      record,
      currentTurn: blockText('current_turn'),
      history: blockText('history'),
      preludeHash: prelude.hash,
    });

    const stored = await this.persistTurn(
      store,
      lookup,
      conversation,
      turn,
      // Kept once per distinct text: only a menu edit or a draft version's file
      // changing mid-conversation adds a second one.
      conversation?.promptPreludes?.some(
        (candidate) => candidate.hash === prelude.hash,
      )
        ? undefined
        : prelude,
    );

    await this.maybeRebuildSummary(runtime, stored, deadlineAt);

    return {
      versionId: runtime.config.versionId,
      response: record.response,
      ...(settled.settledProposal !== undefined
        ? { settledProposal: settled.settledProposal }
        : {}),
    };
  }

  /**
   * The cart calls the proposal tool makes once the guest has accepted.
   *
   * Deliberately the SAME service the guest cart routes use, under the guest's
   * own claims: every ownership rule, cart-state check, and SSE emission that
   * protects a guest editing their own cart protects this path unchanged,
   * because it is that path.
   */
  private createCartExecutor(claims: GuestTokenClaims) {
    return {
      addItem: async (operation: { item: CartItemInput }) => {
        await this.deps.addCartItem(claims, operation.item);
      },
      updateItem: async (operation: {
        itemId: string;
        item: UpdateCartItemRequest;
      }) => {
        await this.deps.updateCartItem(
          claims,
          operation.itemId,
          operation.item,
        );
      },
      removeItem: async (operation: { itemId: string }) => {
        await this.deps.removeCartItem(claims, operation.itemId);
      },
    };
  }

  private buildTurn(input: {
    request: SendAiOrderingMessageRequest;
    runtime: AiOrderingRuntime;
    record: AiOrderingRunRecord;
    /** The `current_turn` and `history` blocks as they were sent to the model. */
    currentTurn: string;
    history: string;
    preludeHash: string;
  }): AiOrderingTurnSnapshot {
    const { record, request, runtime } = input;
    const response = record.response;

    if (!response) {
      throw new InternalServerError('No assistant response to store.');
    }

    return {
      id: this.deps.newId('turn'),
      message: request.message,
      ...(request.responseToPromptId !== undefined
        ? { responseToPromptId: request.responseToPromptId }
        : {}),
      ...(request.selectedOptionId !== undefined
        ? { selectedOptionId: request.selectedOptionId }
        : {}),
      versionId: runtime.config.versionId,
      versionFingerprint: aiOrderingVersionFingerprint(runtime.config),
      provider: runtime.provider,
      modelName: runtime.modelName,
      modelOutput: record.modelOutput,
      modelTrace: {
        currentTurn: input.currentTurn,
        history: input.history,
        preludeHash: input.preludeHash,
        calls: record.calls,
      },
      response,
      // Snapshotted so the NEXT turn can resolve what the guest is answering or
      // reporting on, without trusting anything the client sends back.
      ...(response.type === 'choices'
        ? {
            prompt: {
              promptId: response.promptId,
              question: response.question,
              options: response.options,
            },
          }
        : {}),
      ...(response.type === 'proposal'
        ? {
            proposal: {
              proposalId: response.proposalId,
              operations: response.operations,
            },
          }
        : {}),
      quality: { ...record.quality, cacheReadTokens: record.cacheReadTokens },
      createdAt: this.deps.now(),
    };
  }

  /**
   * Stores the turn, creating the conversation on the guest's first one.
   *
   * Every turn is stored, including turns whose model output was rejected into a
   * degraded response: those are the most useful rows when comparing versions.
   *
   * A write failure fails the request rather than returning the response
   * anyway. An unstored turn breaks the next turn's prompt and outcome
   * resolution, so handing the guest a proposal whose snapshot does not exist
   * would produce a worse failure one message later.
   */
  private async persistTurn(
    store: StoreEntity,
    lookup: {
      storeId: string;
      cartId: string;
      participantId: string;
    },
    existing: AiOrderingConversationEntity | null,
    turn: AiOrderingTurnSnapshot,
    promptPrelude?: AiOrderingPromptPrelude,
  ): Promise<AiOrderingConversationEntity | null> {
    try {
      const conversation =
        existing ??
        (await this.deps.conversations.create({
          organizationId: store.organizationId,
          ...lookup,
        }));

      return await this.deps.conversations.appendTurn(
        conversation.id,
        turn,
        promptPrelude,
      );
    } catch (error) {
      logger.error(
        { err: error, ...lookup },
        'Failed to store an AI ordering conversation turn',
      );

      throw new InternalServerError(
        'The ordering assistant could not save that message.',
        ERROR_CODES.AI_ORDERING_UNAVAILABLE,
      );
    }
  }

  /**
   * Rebuilds the rolling summary when a batch of turns has aged out of the
   * model's window.
   *
   * Runs after the turn is stored and is **non-fatal**: the guest already has
   * their answer, and because the rebuild always reads the original turns, the
   * next batch recovers from exactly the same source. Failing the request over a
   * maintenance step would trade a working answer for nothing.
   *
   * It is awaited rather than left dangling, which keeps it deterministic and
   * testable at the cost of adding one model call to the turn that triggers it —
   * roughly one turn in `summarizeAfterAgedOutTurns` once a conversation is past
   * the window. Moving it off the request path is worthwhile only if that
   * latency shows up in practice.
   */
  private async maybeRebuildSummary(
    runtime: AiOrderingRuntime,
    conversation: AiOrderingConversationEntity | null,
    deadlineAt: number,
  ): Promise<void> {
    if (!conversation) {
      return;
    }

    const plan = planAiOrderingSummarization(conversation, runtime.config);

    if (!plan) {
      return;
    }

    try {
      const result = await generateAiOrderingSummary({
        plan,
        config: runtime.config,
        callSummaryModel: runtime.createSummaryCaller(deadlineAt),
      });

      if (!result) {
        return;
      }

      await this.deps.conversations.updateSummary({
        conversationId: conversation.id,
        summary: result.summary,
        summarizedUpToTurnIndex: result.coversUpToTurnIndex,
      });
    } catch (error) {
      logger.warn(
        { err: error, conversationId: conversation.id },
        'Failed to rebuild the AI ordering conversation summary',
      );
    }
  }
}

export function createAiOrderingService(
  overrides: Partial<AiOrderingServiceDeps> = {},
): AiOrderingService {
  return new AiOrderingService({
    conversations: aiOrderingRepository,
    findStore: (storeId) => storeRepository.findById(storeId),
    getPublicMenu: (storeId) => publicStoreService.getPublicMenu(storeId),
    getGuestCart: (claims) => guestOrderingService.getGuestCart(claims),
    addCartItem: (claims, request) =>
      guestOrderingService.addCartItem(claims, request),
    updateCartItem: (claims, itemId, request) =>
      guestOrderingService.updateCartItem(claims, itemId, request),
    removeCartItem: (claims, itemId) =>
      guestOrderingService.removeCartItem(claims, itemId),
    resolveRuntime: () => resolveAiOrderingRuntime(),
    getCheckpointer: () => getAiOrderingCheckpointer(),
    rateLimiter: createRedisAiOrderingRateLimiter({
      maxRequestsPerWindow: MAX_REQUESTS_PER_WINDOW,
      windowMs: RATE_LIMIT_WINDOW_MS,
      lockTtlMs: IN_FLIGHT_LOCK_TTL_MS,
    }),
    newId: (prefix) => `${prefix}-${randomUUID()}`,
    now: () => new Date(),
    ...overrides,
  });
}

export const aiOrderingService = createAiOrderingService();
