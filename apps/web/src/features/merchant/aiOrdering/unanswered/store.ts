import { createStore } from 'zustand/vanilla';

import type {
  AiOrderingUnansweredEntry,
  AiOrderingUnansweredReason,
} from '@/models/aiOrdering';

export type AiOrderingUnansweredState = {
  entries: AiOrderingUnansweredEntry[];
  total: number;
  page: number;
  pageSize: number;
  reason: AiOrderingUnansweredReason | null;
  isLoading: boolean;
  error: string | null;
};

export function createAiOrderingUnansweredStore() {
  return createStore<AiOrderingUnansweredState>(() => ({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 20,
    reason: null,
    isLoading: false,
    error: null,
  }));
}

export type AiOrderingUnansweredStore = ReturnType<
  typeof createAiOrderingUnansweredStore
>;
