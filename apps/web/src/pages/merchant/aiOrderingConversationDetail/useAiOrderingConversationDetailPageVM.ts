import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';

import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from '@/app/routing/paths';
import { toAiOrderingReviewTurnRow } from '@/features/components/aiOrdering/conversationTurnRow';
import { createAiOrderingConversationsRuntime } from '@/features/merchant/aiOrdering/conversations/runtime';

import { handleMerchantFailure } from '../merchantFailureFeedback';
import { createAiOrderingConversationDetailPageCommands } from './aiOrderingConversationDetailPage.commands';

function createContext() {
  const { actions, store } = createAiOrderingConversationsRuntime();

  return {
    commands: createAiOrderingConversationDetailPageCommands(actions),
    store,
  };
}

export function useAiOrderingConversationDetailPageVM() {
  const [{ commands, store }] = useState(createContext);
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const detail = useStore(store, (state) => state.detail);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const load = useCallback(async () => {
    if (!storeId || !conversationId) return;

    const result = await commands.loadConversation(storeId, conversationId);

    if (result.status === 'failed') {
      handleMerchantFailure(result);
    }
  }, [commands, conversationId, storeId]);

  useEffect(() => {
    void load();

    // Cleared on leaving so the next conversation never flashes this one.
    return () => {
      commands.clearConversation();
    };
  }, [commands, load]);

  const turns = useMemo(
    () => (detail ? detail.turns.map(toAiOrderingReviewTurnRow) : []),
    [detail],
  );

  const goBack = useCallback(() => {
    void navigate(PATHS.MERCHANT.AI_CONVERSATIONS);
  }, [navigate]);

  return {
    conversationId: detail?.id ?? conversationId ?? '',
    participantId: detail?.participantId ?? '',
    summary: detail?.summary ?? null,
    turns,
    degradedTurnCount: turns.filter((turn) => turn.wasDegraded).length,
    isLoading,
    error,
    retry: load,
    goBack,
  };
}
