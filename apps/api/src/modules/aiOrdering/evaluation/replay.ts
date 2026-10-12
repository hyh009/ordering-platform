/**
 * Running stored guest messages against a chosen version and model, over the
 * frozen fixture.
 *
 * This is the half of version management that makes versioning worth having. A
 * version exists so an old prompt can be tried against a newer model; without a
 * way to actually run it, a `versionId` is just a label on old rows.
 *
 * Three things are held still so a difference in output is attributable:
 *
 *   the menu and cart   the frozen fixture, never live store data
 *   the guest messages  real ones, replayed verbatim
 *   everything else     one axis at a time — version, or provider+model
 *
 * Nothing here writes. Replay reads stored messages and produces a report; it
 * never appends a turn, so running it cannot pollute the corpus it reads from.
 */

import { MemorySaver } from '@langchain/langgraph';
import { buildAiOrderingContext } from '@src/modules/aiOrdering/context';
import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  AI_ORDERING_MENU_FIXTURE,
} from '@src/modules/aiOrdering/evaluation/fixture';
import { createAiOrderingAgent } from '@src/modules/aiOrdering/runtime/agent';
import { createAiOrderingDebugTrace } from '@src/modules/aiOrdering/runtime/debugTrace';
import { aiOrderingVersionFingerprint } from '@src/modules/aiOrdering/versions/fingerprint';

import type {
  AiOrderingResponseType,
  CartDto,
  PublicMenuDto,
  SupportedLocale,
} from '@repo/shared';
import type {
  AiOrderingContextInput,
  AiOrderingHistoryTurn,
  AiOrderingVersionConfig,
} from '@src/modules/aiOrdering/types';

/** One guest message to replay, with where it came from when it came from the corpus. */
export type AiOrderingReplayCase = {
  message: string;
  /**
   * Earlier turns to put in front of the message, written out by hand.
   *
   * Scripted, never carried over from the case before: a case still depends on
   * nothing but itself, so two versions are compared on the same input.
   */
  history?: AiOrderingHistoryTurn[];
  /**
   * Proposals the scripted history made, and how they ended, oldest first.
   * Scripted for the same reason, and each entry names its own turn.
   */
  proposalLog?: NonNullable<AiOrderingContextInput['proposalLog']>;
  /**
   * The cart this case reads against, replacing the fixture's.
   *
   * Most cases share one cart so that a prompt edit is compared on identical
   * input. A behavior that only appears at a particular cart SHAPE — a line
   * standing at more than one, an item of another guest's — cannot be written
   * that way: adding the line to the shared fixture would change the prompt of
   * every other case at the same time, and the suite's totals would stop being
   * comparable across runs. Such a case carries its own cart instead, and still
   * depends on nothing but itself.
   *
   * Validation reads this same cart, so an `itemId` here is a real target.
   */
  cart?: CartDto;
  /**
   * The menu this case reads against, replacing the fixture's.
   *
   * Same reasoning as `cart`, for a behavior that only appears at a particular
   * MENU shape — two products sharing a name stem, a category with one item.
   * Adding such a product to the shared fixture would change the prompt of
   * every other case at once.
   *
   * Validation reads this same menu, so a `productId` here is a real target.
   */
  menu?: PublicMenuDto;
  /**
   * The language this guest's interface is in, when it is not the run's.
   *
   * What the web client sends as `locale`. Per case rather than per run because
   * the suite is otherwise one language, and a second run in another language
   * would be a second suite whose totals nobody adds up.
   */
  interfaceLocale?: SupportedLocale;
  source?: { conversationId: string; turnId: string };
};

export type AiOrderingReplayOutcome = {
  message: string;
  /** `null` when the turn produced nothing usable even after the repair. */
  responseType: AiOrderingResponseType | null;
  reply?: string;
  /** One line per proposed operation, so two runs are comparable at a glance. */
  operationSummaries: string[];
  /** What a `choices` response asked and offered; absent for every other type. */
  asked?: { question: string; optionLabels: string[] }[];
  /** What a `products` response put on screen; absent for every other type. */
  shown?: { productIds: string[]; categoryId?: string };
  repairAttempted: boolean;
  droppedOperationCount: number;
  ownershipViolationCount: number;
  /** Set when the turn failed outright: a gate rejection or a provider error. */
  failure?: string;
};

export type AiOrderingReplayRun = {
  versionId: string;
  versionFingerprint: string;
  provider: string;
  modelName: string;
  outcomes: AiOrderingReplayOutcome[];
};

export type AiOrderingReplayInput = {
  config: AiOrderingVersionConfig;
  provider: string;
  modelName: string;
  cases: AiOrderingReplayCase[];
  locale?: SupportedLocale;
  /**
   * Built per case by the caller, because one session per turn is what the
   * production path does and pooling them would pool their token counts.
   */
  /**
   * The chat model to drive, un-bound: `createAgent` binds the tools. Named
   * for what it returns, because a field called `createModel` here once read
   * as the runtime's own `createModel` — a pre-bound wrapper the agent could
   * not accept, which kept that dead path looking alive.
   */
  createChatModel: () => unknown;
  toToolSchema: (schema: unknown) => Record<string, unknown>;
  /**
   * Smallest gap between two cases, in milliseconds.
   *
   * The free tier counts requests per MINUTE (15 for `gemini-3.5-flash-lite`),
   * and a suite is one planning call per case plus a repair when one is needed —
   * so an unpaced run exhausts the minute partway through and scores the rest of
   * the cases as provider failures. A suite that stops being a measurement
   * halfway is worse than a slow one.
   */
  minIntervalMs?: number;
};

/**
 * Default pace: the free tier allows 15 requests a minute.
 *
 * Paced for a repair on EVERY case, not an occasional one. A repair fires
 * immediately after the call it repairs, so a case can cost two requests back
 * to back; 5s between cases was paced for one call each and ran out of quota on
 * a run where 4 of 14 cases needed a repair. At 10s a minute holds six cases,
 * so twelve requests at the worst, and the suite takes about two and a half
 * minutes.
 */
const AI_ORDERING_REPLAY_MIN_INTERVAL_MS = 10_000;

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Replays every case against one version.
 *
 * `confirmationRequired` is pinned to true rather than resolved from a store:
 * replay compares what the model PROPOSES, and a store's automatic-application
 * setting changes only what the client then does with it.
 */
export async function replayAiOrderingVersion(
  input: AiOrderingReplayInput,
): Promise<AiOrderingReplayRun> {
  const outcomes: AiOrderingReplayOutcome[] = [];
  const minIntervalMs =
    input.minIntervalMs ?? AI_ORDERING_REPLAY_MIN_INTERVAL_MS;
  let previousStartedAt = 0;

  for (const replayCase of input.cases) {
    const waitMs = previousStartedAt + minIntervalMs - Date.now();

    if (waitMs > 0) {
      await sleep(waitMs);
    }

    previousStartedAt = Date.now();
    outcomes.push(await replayOne(input, replayCase));
  }

  return {
    versionId: input.config.versionId,
    versionFingerprint: aiOrderingVersionFingerprint(input.config),
    provider: input.provider,
    modelName: input.modelName,
    outcomes,
  };
}

async function replayOne(
  input: AiOrderingReplayInput,
  replayCase: AiOrderingReplayCase,
): Promise<AiOrderingReplayOutcome> {
  const cart = replayCase.cart ?? AI_ORDERING_CART_FIXTURE;
  const menu = replayCase.menu ?? AI_ORDERING_MENU_FIXTURE;
  const context = buildAiOrderingContext({
    config: input.config,
    locale: input.locale ?? 'zh-TW',
    ...(replayCase.interfaceLocale !== undefined
      ? { guestLocale: replayCase.interfaceLocale }
      : {}),
    storeName: 'Replay Fixture',
    menu,
    cart,
    participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
    message: replayCase.message,
    // Each case is replayed cold. Carrying history from one case into the next
    // would make an outcome depend on the outcome before it, and two versions
    // would then diverge for reasons neither prompt is responsible for. A case
    // that needs earlier turns scripts its own.
    history: replayCase.history ?? [],
    ...(replayCase.proposalLog !== undefined
      ? { proposalLog: replayCase.proposalLog }
      : {}),
  });

  // The same agent production runs, with an in-memory checkpointer and a resume
  // that never comes. A proposal pauses the run and is read off the record; the
  // tool body is therefore unreachable, so replay stays read-only BY
  // CONSTRUCTION rather than by remembering not to execute. Measuring a second,
  // parallel planning path would make the report evidence about the wrong code.
  const { agent, record, messages } = createAiOrderingAgent({
    config: input.config,
    context,
    validation: {
      menu,
      cart,
      participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
    },
    confirmationRequired: true,
    // Labels follow the interface, as they do in the service.
    locale: replayCase.interfaceLocale ?? input.locale ?? 'zh-TW',
    guestMessage: replayCase.message,
    onModelCall: createAiOrderingDebugTrace('replay'),
    newId: (prefix) => `${prefix}-replay`,
    toToolSchema: input.toToolSchema,
    model: input.createChatModel(),
    checkpointer: new MemorySaver(),
    executor: {
      addItem: () => {
        throw new Error('replay never executes');
      },
      updateItem: () => {
        throw new Error('replay never executes');
      },
      removeItem: () => {
        throw new Error('replay never executes');
      },
    },
  });

  try {
    await agent.invoke(
      { messages },
      {
        configurable: {
          thread_id: `replay-${replayCase.message.slice(0, 40)}`,
        },
      },
    );
  } catch (error) {
    return {
      message: replayCase.message,
      responseType: null,
      operationSummaries: [],
      repairAttempted: false,
      droppedOperationCount: 0,
      ownershipViolationCount: 0,
      failure: error instanceof Error ? error.message : 'provider call failed',
    };
  }

  const base = {
    message: replayCase.message,
    repairAttempted: record.quality.repairAttempted,
    droppedOperationCount: record.quality.droppedOperationCount,
    ownershipViolationCount: record.quality.ownershipViolationCount,
  };

  if (!record.response) {
    return {
      ...base,
      responseType: null,
      operationSummaries: [],
      failure: record.rejectionDetail ?? 'unusable model output',
    };
  }

  const response = record.response;

  return {
    ...base,
    responseType: response.type,
    reply: response.reply,
    operationSummaries:
      response.type === 'proposal'
        ? response.operations.map((operation) => operation.summary)
        : [],
    ...(response.type === 'products'
      ? {
          shown: {
            productIds: response.productIds,
            ...(response.categoryId !== undefined
              ? { categoryId: response.categoryId }
              : {}),
          },
        }
      : {}),
    ...(response.type === 'choices'
      ? {
          asked: [
            {
              question: response.question,
              optionLabels: response.options.map((option) => option.label),
            },
          ],
        }
      : {}),
  };
}

export type AiOrderingReplayComparisonRow = {
  message: string;
  /** One entry per run, in the order the runs were given. */
  outcomes: (AiOrderingReplayOutcome | undefined)[];
  /**
   * Whether the runs disagreed about the KIND of answer. The cheap signal: two
   * versions wording a reply differently is expected, one proposing and the
   * other refusing is the thing to look at.
   */
  responseTypesDiffer: boolean;
};

/**
 * Lines the runs up by message.
 *
 * Keyed by message text rather than by index so a run that failed to produce an
 * outcome for one case still lines up for the rest.
 */
export function compareAiOrderingReplayRuns(
  runs: AiOrderingReplayRun[],
): AiOrderingReplayComparisonRow[] {
  const messages: string[] = [];

  for (const run of runs) {
    for (const outcome of run.outcomes) {
      if (!messages.includes(outcome.message)) {
        messages.push(outcome.message);
      }
    }
  }

  return messages.map((message) => {
    const outcomes = runs.map((run) =>
      run.outcomes.find((outcome) => outcome.message === message),
    );

    const types = outcomes.map((outcome) => outcome?.responseType ?? 'missing');

    return {
      message,
      outcomes,
      responseTypesDiffer: new Set(types).size > 1,
    };
  });
}
