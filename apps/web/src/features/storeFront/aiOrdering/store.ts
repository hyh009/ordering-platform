import { createStore } from 'zustand/vanilla';

import type {
  AiOrderingOperationModel,
  AiOrderingResponseModel,
} from '@/models/aiOrdering';
import type { StoreFrontCommandFailureReason } from '@/services/utils/storeFrontApiError';

/**
 * One line of the transcript. The guest's own message is kept beside the
 * assistant's answers so the panel renders a conversation rather than a list of
 * replies, and so a `choices` answer can be read against the question it
 * followed.
 */
export type AiOrderingChatEntry =
  | { id: string; role: 'guest'; message: string }
  | {
      id: string;
      role: 'assistant';
      versionId: string;
      response: AiOrderingResponseModel;
    };

/**
 * What became of one proposed row, from the guest's side.
 *
 * Distinct from the contract's outcome enum on purpose: `pending` is a UI state
 * with no outcome yet, and the translation to an outcome happens only when the
 * proposal is reported (see `outcome.ts`). Collapsing the two would force this
 * store to invent an outcome for a row the guest has not decided on.
 */
export type AiOrderingProposalRowStatus =
  | 'pending'
  | 'dismissed'
  | 'applied'
  | 'failed';

export type AiOrderingProposalRow = {
  operation: AiOrderingOperationModel;
  status: AiOrderingProposalRowStatus;
  /**
   * Set only when `status` is `failed`; a stable code, never raw error text.
   *
   * Typed as the command failure reason rather than a loose string so the
   * presentation layer can map it exhaustively: a new reason has to declare
   * what the guest reads, instead of silently falling into a generic line.
   */
  failureCode?: StoreFrontCommandFailureReason;
  /** True only while a retry of this one row is in flight. */
  isRetrying?: boolean;
};

/**
 * The proposal the guest is currently deciding on, or the one they just applied.
 *
 * It survives past applying so the panel can show the per-row result, and is
 * cleared only when the next message is sent — which is also when its outcome is
 * reported. There is never more than one: a new message ends the previous one.
 */
export type AiOrderingPendingProposal = {
  proposalId: string;
  /** Resolved server-side. The client never decides this. */
  confirmationRequired: boolean;
  rows: AiOrderingProposalRow[];
  /** True once apply has run, so the panel shows results instead of controls. */
  isApplied: boolean;
};

export type StoreFrontAiOrderingState = {
  entries: AiOrderingChatEntry[];
  proposal: AiOrderingPendingProposal | null;
  isSending: boolean;
  /**
   * Whether an apply of the open proposal is in flight.
   *
   * Separate from `isSending` because they are different operations with
   * different readers: the transcript auto-scroll reacts to `isSending`, and an
   * apply must not scroll the transcript. It is also the guard the apply command
   * checks, so a second apply cannot post the same operations twice.
   */
  isApplying: boolean;
  /**
   * Whether the stored transcript has been read for this cart.
   *
   * The transcript is the server's, not the client's: it survives a reload, and
   * the assistant reads all of it on every turn. This flag is what keeps the
   * panel from reading it twice, and from treating "nothing said yet" the same
   * as "not fetched yet" — the empty-state hint belongs only to the first.
   */
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
};

export function createStoreFrontAiOrderingStore() {
  return createStore<StoreFrontAiOrderingState>(() => ({
    entries: [],
    proposal: null,
    isSending: false,
    isApplying: false,
    isLoaded: false,
    isLoading: false,
    error: null,
  }));
}

export type StoreFrontAiOrderingStore = ReturnType<
  typeof createStoreFrontAiOrderingStore
>;
