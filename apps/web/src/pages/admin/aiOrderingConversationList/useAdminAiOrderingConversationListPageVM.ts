import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useStore } from 'zustand';

import { PATHS } from '@/app/routing/paths';
import { createAdminAiOrderingConversationsRuntime } from '@/features/admin/aiOrdering/conversations/runtime';

import { handleAdminFailure } from '../adminFailureFeedback';
import { createAdminAiOrderingConversationListPageCommands } from './aiOrderingConversationListPage.commands';

const PAGE_PARAM = 'page';
const DEFAULT_PAGE = 1;
const PAGE_SIZE = 20;

function parsePage(value: string | null): number {
  const parsed = value !== null ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isNaN(parsed) || parsed < 1 ? DEFAULT_PAGE : parsed;
}

function createContext() {
  const { actions, store } = createAdminAiOrderingConversationsRuntime();

  return {
    commands: createAdminAiOrderingConversationListPageCommands(actions),
    store,
  };
}

/**
 * The store comes from the route, not from an active-store selection: the
 * platform reaches any store directly and is never "inside" one the way a
 * merchant is.
 */
export function useAdminAiOrderingConversationListPageVM() {
  const [{ commands, store }] = useState(createContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { storeId } = useParams<{ storeId: string }>();

  const page = parsePage(searchParams.get(PAGE_PARAM));

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
      handleAdminFailure(result);
    }
  }, [commands, page, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openConversation = useCallback(
    (conversationId: string) => {
      if (!storeId) return;

      void navigate(
        PATHS.SUPER_ADMIN.AI_CONVERSATION_DETAIL_BUILD(storeId, conversationId),
      );
    },
    [navigate, storeId],
  );

  return {
    storeId: storeId ?? '',
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
  };
}
