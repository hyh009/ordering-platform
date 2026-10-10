import { createStore } from 'zustand/vanilla';

import type {
  AiOrderingAppliedSummaryModel,
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
      /**
       * The lines of the operations the guest changed before accepting, as
       * they were applied. Absent when they changed none, in which case each
       * operation's own summary already says what was applied.
       */
      proposalAppliedSummaries?: AiOrderingAppliedSummaryModel[];
      /**
       * What the assistant said about the decision, once it was made.
       *
       * Beside the row statuses rather than instead of them: the statuses say
       * what became of each operation, and this says what that means. Absent
       * when nothing was attempted — dismissing every row is answered with
       * nothing, since there is no outcome to report.
       */
      proposalReply?: string;
    };

/**
 * What became of one proposed row.
 *
 * `pending` is the only status the client writes on its own, and it means the
 * guest has not decided yet. Every other status comes back from the server with
 * the decision, because the server is what executed it.
 *
 * The three ways a row can end up unapplied are not collapsed, because they read
 * differently to a guest looking back at the conversation: `dismissed` is "you
 * said no", `unanswered` is "you never answered this one", and `not-attempted`
 * is "a failure stopped the proposal before we reached it".
 */
export type AiOrderingProposalRowStatus =
  | 'pending'
  | 'dismissed'
  | 'unanswered'
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
  /**
   * What the guest has answered on this proposal, by operation id and then
   * modifier id. An entry overrides what the operation's own choice says is
   * selected; an empty list is the answer "none".
   *
   * Held on the proposal rather than beside it so it cannot outlive the thing
   * it answers: a new proposal replaces the whole object, and stale answers
   * cannot be sent with it. Answering costs no request — the options were
   * already delivered with the proposal — so this is the only place an answer
   * lives until the guest applies.
   */
  choiceAnswers: Record<string, Record<string, string[]>>;
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
