import { createStore } from 'zustand/vanilla';

import type {
  AiOrderingConversationDetail,
  AiOrderingConversationSummary,
} from '@/models/aiOrdering';

export type AiOrderingConversationsState = {
  conversations: AiOrderingConversationSummary[];
  total: number;
  page: number;
  pageSize: number;
  /** The conversation currently open, or null on the list. */
  detail: AiOrderingConversationDetail | null;
  isLoading: boolean;
  error: string | null;
};

export function createAiOrderingConversationsStore() {
  return createStore<AiOrderingConversationsState>(() => ({
    conversations: [],
    total: 0,
    page: 1,
    pageSize: 20,
    detail: null,
    isLoading: false,
    error: null,
  }));
}

export type AiOrderingConversationsStore = ReturnType<
  typeof createAiOrderingConversationsStore
>;
