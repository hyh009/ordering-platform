import { randomUUID } from 'node:crypto';

import { AI_ORDERING_MAX_TURNS_PER_CONVERSATION } from '@src/models/aiOrdering/model';
import { resolveAiOrderingConfirmationRequired } from '@src/modules/aiOrdering/confirmation';
import { buildAiOrderingContext } from '@src/modules/aiOrdering/context';
import {
  planAiOrderingSummarization,
  windowAiOrderingHistory,
} from '@src/modules/aiOrdering/history';
import { planAiOrderingTurn } from '@src/modules/aiOrdering/planner';
import {
  resolveAiOrderingPrompt,
  resolveAiOrderingReportedOutcomes,
} from '@src/modules/aiOrdering/promptResolution';
import { createRedisAiOrderingRateLimiter } from '@src/modules/aiOrdering/rateLimit.redis';
import { resolveAiOrderingRuntime } from '@src/modules/aiOrdering/runtime';
import { mapAiOrderingProviderFailure } from '@src/modules/aiOrdering/runtime/failures';
import { createAiOrderingModelSession } from '@src/modules/aiOrdering/runtime/model';
import { generateAiOrderingSummary } from '@src/modules/aiOrdering/summary';
import { aiOrderingRepository } from '@src/repositories/aiOrdering/repository';
import { storeRepository } from '@src/repositories/store/repository';
import { guestOrderingService } from '@src/services/guestOrdering.service';
import { publicStoreService } from '@src/services/publicStore.service';
import { ERROR_CODES } from '@src/utils/errorCode.js';
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  TooManyRequestsError,
} from '@src/utils/errors';
import { logger } from '@src/utils/logger';

import type {
  AiOrderingTurnResponseData,
  CartDto,
  PublicMenuDto,
  SendAiOrderingMessageRequest,
} from '@repo/shared';
import type {
  AiOrderingConversationEntity,
  AiOrderingTurnSnapshot,
} from '@src/models/aiOrdering/model';
import type { StoreEntity } from '@src/models/store/model';
import type { AiOrderingRateLimiter } from '@src/modules/aiOrdering/rateLimit';
import type { AiOrderingRuntime } from '@src/modules/aiOrdering/runtime';
import type { AiOrderingRepository } from '@src/repositories/aiOrdering/repository';
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
  resolveRuntime: () => AiOrderingRuntime | null;
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

    const outcomes = resolveAiOrderingReportedOutcomes(
      conversation,
      request.previousOutcome,
    );

    if (outcomes.unknownProposal) {
      logger.warn(
        { ...lookup, proposalId: request.previousOutcome?.proposalId },
        'AI ordering outcome reported for a proposal this conversation never issued',
      );
    }

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
      ...(outcomes.results.length > 0
        ? { reportedOutcomes: outcomes.results }
        : {}),
    });

    const session = createAiOrderingModelSession({
      model: runtime.createModel(),
      config: runtime.config,
      deadlineAt,
    });

    let plan;

    try {
      plan = await planAiOrderingTurn({
        config: runtime.config,
        context,
        validation: { menu, cart, participantId: claims.participantId },
        confirmationRequired,
        callModel: session.callModel,
        newId: this.deps.newId,
      });
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

    if (!plan.ok) {
      // Nothing usable came back twice. There is no response the guest saw, so
      // there is no turn to store; the raw output is logged instead.
      logger.error(
        { ...lookup, detail: plan.detail, modelOutput: plan.modelOutput },
        'AI ordering model output was unusable after a repair attempt',
      );

      throw new InternalServerError(
        'The ordering assistant could not answer that.',
        ERROR_CODES.AI_ORDERING_UNAVAILABLE,
      );
    }

    const turn = this.buildTurn({
      request,
      runtime,
      plan,
      cacheReadTokens: session.getUsage().cacheReadTokens,
      reportedOutcomes: outcomes.results,
    });

    const stored = await this.persistTurn(store, lookup, conversation, turn);

    await this.maybeRebuildSummary(runtime, stored, deadlineAt);

    return { versionId: runtime.config.versionId, response: plan.response };
  }

  private buildTurn(input: {
    request: SendAiOrderingMessageRequest;
    runtime: AiOrderingRuntime;
    plan: Extract<Awaited<ReturnType<typeof planAiOrderingTurn>>, { ok: true }>;
    cacheReadTokens: number;
    reportedOutcomes: AiOrderingTurnSnapshot['reportedOutcomes'];
  }): AiOrderingTurnSnapshot {
    const { plan, request, runtime } = input;
    const response = plan.response;

    return {
      id: this.deps.newId('turn'),
      message: request.message,
      ...(request.responseToPromptId !== undefined
        ? { responseToPromptId: request.responseToPromptId }
        : {}),
      ...(request.selectedOptionId !== undefined
        ? { selectedOptionId: request.selectedOptionId }
        : {}),
      ...(input.reportedOutcomes && input.reportedOutcomes.length > 0
        ? { reportedOutcomes: input.reportedOutcomes }
        : {}),
      versionId: runtime.config.versionId,
      provider: runtime.provider,
      modelName: runtime.modelName,
      modelOutput: plan.modelOutput,
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
      quality: { ...plan.quality, cacheReadTokens: input.cacheReadTokens },
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
  ): Promise<AiOrderingConversationEntity | null> {
    try {
      const conversation =
        existing ??
        (await this.deps.conversations.create({
          organizationId: store.organizationId,
          ...lookup,
        }));

      return await this.deps.conversations.appendTurn(conversation.id, turn);
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
    resolveRuntime: () => resolveAiOrderingRuntime(),
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
