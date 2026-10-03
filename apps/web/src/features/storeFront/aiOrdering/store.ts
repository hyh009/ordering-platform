import { createStore } from 'zustand/vanilla';

import type {
  AiOrderingOperationModel,
  AiOrderingOperationResult,
  AiOrderingResponseModel,
} from '@/models/aiOrdering';

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
      /**
       * Present on a decided proposal, from the server's own record.
       *
       * Carried on the entry rather than looked up when drawing, because a
       * restored transcript has no other source: the panel did not watch the
       * decision happen, and guessing from position is what used to tell a guest
       * to ask again for something already in their cart.
       */
      proposalResults?: AiOrderingOperationResult[];
    };

/**
 * What became of one proposed row.
 *
 * `pending` is the only status the client writes on its own, and it means the
 * guest has not decided yet. Every other status comes back from the server with
 * the decision, because the server is what executed it.
 *
 * `not-attempted` is distinct from `dismissed`: one is "a failure stopped the
 * proposal before we reached this", the other is "the guest said no". They read
 * differently to a guest looking at the rows, so they are not collapsed.
 */
export type AiOrderingProposalRowStatus =
  | 'pending'
  | 'dismissed'
  | 'applied'
  | 'failed'
  | 'not-attempted';

export type AiOrderingProposalRow = {
  operation: AiOrderingOperationModel;
  status: AiOrderingProposalRowStatus;
  /**
   * Set only when `status` is `failed`; a stable code, never raw error text.
   *
   * A backend error code now rather than a client-side failure reason, because
   * the side that attempted the operation is the side that names why it failed.
   * The presentation layer maps it to wording the guest reads.
   */
  failureCode?: string;
};

/**
 * The proposal the guest is currently deciding on, or the one they just decided.
 *
 * It survives past the decision so the panel can show the per-row result, and is
 * cleared when the next message is sent. There is never more than one: a new
 * message ends the previous one.
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
   * apply must not scroll the transcript. It is also the guard the decision
   * command checks, so a second decision cannot be sent while one is in flight.
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
