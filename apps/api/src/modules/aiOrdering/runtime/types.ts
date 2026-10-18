import type { BaseCheckpointSaver } from '@langchain/langgraph';
import type {
  AiOrderingOperationResult,
  AiOrderingResponse,
  SupportedLocale,
} from '@repo/shared';
import type {
  AiOrderingModelCallRecord,
  AiOrderingTurnQualitySignals,
} from '@src/models/aiOrdering/model';
import type { AiOrderingCartExecutor } from '@src/modules/aiOrdering/cartExecution';
import type { AiOrderingModelCallObserver } from '@src/modules/aiOrdering/runtime/debugTrace';
import type {
  AiOrderingAssembledContext,
  AiOrderingVersionConfig,
} from '@src/modules/aiOrdering/types';
import type { AiOrderingValidationInput } from '@src/modules/aiOrdering/validation';

/**
 * What the run produced, collected as it goes.
 *
 * A mutable object rather than agent state because the service owns it: the
 * response, the quality signals, and the execution results are all things the
 * service persists, and threading them back out through the graph's state would
 * only be a longer way to reach the same object.
 */
export type AiOrderingRunRecord = {
  /** `planning` until the proposal executes, `closing` for the reply after it. */
  phase: 'planning' | 'closing';
  /** The response the guest should see. Null when nothing usable was produced. */
  response: AiOrderingResponse | null;
  /** Raw model output of the attempt that was used, kept for the corpus. */
  modelOutput: unknown;
  /** Set when no attempt produced anything usable. */
  rejectionDetail: string | null;
  quality: AiOrderingTurnQualitySignals;
  /** Set once the proposal tool has run. */
  results: AiOrderingOperationResult[] | null;
  cacheReadTokens: number;
  /** Every model call this run made, including the repair and the closing one. */
  modelCalls: number;
  /** What each of those calls was given and returned, in order, for review. */
  calls: AiOrderingModelCallRecord[];
};

export type AiOrderingAgentInput = {
  config: AiOrderingVersionConfig;
  context: AiOrderingAssembledContext;
  validation: AiOrderingValidationInput;
  confirmationRequired: boolean;
  newId: (prefix: string) => string;
  /** The locale the per-operation labels are written in. */
  locale: SupportedLocale;
  /** What the guest typed this turn. Only read to pick a fallback language. */
  guestMessage: string;
  /** Applied to each tool's argument schema; the provider decides its dialect. */
  toToolSchema: (schema: unknown) => Record<string, unknown>;
  model: unknown;
  checkpointer: BaseCheckpointSaver;
  executor: AiOrderingCartExecutor;
  /**
   * The operations the guest removed from the proposal before accepting it.
   *
   * Reported by the proposal tool and never executed. The resume rewrites the
   * pending call to the kept operations only, so without this the model sees a
   * proposal of one operation where it made two, and cannot mention the row the
   * guest took out — the outcome inferred from absence that
   * `AiOrderingProposalDecision.results` already refuses to allow anywhere else.
   *
   * Empty on a first run, where nothing has been decided yet.
   */
  dismissedOperationIds?: string[] | undefined;
  /** Epoch milliseconds the whole turn must finish by. */
  deadlineAt?: number | undefined;
  /** Shown every model call as it happens. A debugging aid; see `debugTrace.ts`. */
  onModelCall?: AiOrderingModelCallObserver | undefined;
};
