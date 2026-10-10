import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useStore } from 'zustand';

import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from '@/app/routing/paths';
import { createAiOrderingConversationsRuntime } from '@/features/merchant/aiOrdering/conversations/runtime';

import { handleMerchantFailure } from '../merchantFailureFeedback';
import { createAiOrderingConversationListPageCommands } from './aiOrderingConversationListPage.commands';

const PAGE_PARAM = 'page';
const DEFAULT_PAGE = 1;
const PAGE_SIZE = 20;

function parsePage(value: string | null): number {
  const parsed = value !== null ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isNaN(parsed) || parsed < 1 ? DEFAULT_PAGE : parsed;
}

function createContext() {
  const { actions, store } = createAiOrderingConversationsRuntime();

  return {
    commands: createAiOrderingConversationListPageCommands(actions),
    store,
  };
}

export function useAiOrderingConversationListPageVM() {
  const [{ commands, store }] = useState(createContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const storeId = useStore(activeStoreStore, (state) => state.storeId);

  const conversations = useStore(store, (state) => state.conversations);
  const total = useStore(store, (state) => state.total);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set(PAGE_PARAM, String(nextPage));
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const load = useCallback(async () => {
    if (!storeId) return;

    const result = await commands.loadConversations(storeId, {
      page,
      pageSize: PAGE_SIZE,
    });

    if (result.status === 'failed') {
      handleMerchantFailure(result);
    }
  }, [commands, page, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openConversation = useCallback(
    (conversationId: string) => {
      void navigate(
        PATHS.MERCHANT.AI_CONVERSATION_DETAIL_BUILD(conversationId),
      );
    },
    [navigate],
  );

  const goToUnanswered = useCallback(() => {
    void navigate(PATHS.MERCHANT.AI_UNANSWERED);
  }, [navigate]);

  return {
    conversations,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
    pageSize: PAGE_SIZE,
    isLoading,
    error,
    setPage,
    retry: load,
    openConversation,
    goToUnanswered,
  };
}
