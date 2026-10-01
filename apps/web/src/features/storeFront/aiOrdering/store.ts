import { createStore } from 'zustand/vanilla';

import type {
  AiOrderingOperationModel,
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
  /** Set only when `status` is `failed`; a stable code, never raw error text. */
  failureCode?: string;
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
  error: string | null;
};

export function createStoreFrontAiOrderingStore() {
  return createStore<StoreFrontAiOrderingState>(() => ({
    entries: [],
    proposal: null,
    isSending: false,
    error: null,
  }));
}

export type StoreFrontAiOrderingStore = ReturnType<
  typeof createStoreFrontAiOrderingStore
>;
