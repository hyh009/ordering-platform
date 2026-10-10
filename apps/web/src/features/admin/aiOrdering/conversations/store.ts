import { createStore } from 'zustand/vanilla';

import type {
  AiOrderingConversationDetail,
  AiOrderingConversationSummary,
} from '@/models/aiOrdering';

/**
 * The platform's copy of the conversations read state.
 *
 * Its own store rather than the merchant feature's, because the two are read
 * through different endpoints under different authorities: sharing the state
 * would make a merchant page and a platform page able to hand each other a
 * detail one of them was never allowed to fetch.
 */
export type AdminAiOrderingConversationsState = {
  conversations: AiOrderingConversationSummary[];
  total: number;
  page: number;
  pageSize: number;
  /** The conversation currently open, or null on the list. */
  detail: AiOrderingConversationDetail | null;
  isLoading: boolean;
  error: string | null;
};

export function createAdminAiOrderingConversationsStore() {
  return createStore<AdminAiOrderingConversationsState>(() => ({
    conversations: [],
    total: 0,
    page: 1,
    pageSize: 20,
    detail: null,
    isLoading: false,
    error: null,
  }));
}

export type AdminAiOrderingConversationsStore = ReturnType<
  typeof createAdminAiOrderingConversationsStore
>;
