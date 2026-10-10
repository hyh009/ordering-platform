import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useStore } from 'zustand';

import { createAdminAiOrderingConversationsRuntime } from '@/features/admin/aiOrdering/conversations/runtime';
import { toAiOrderingReviewTurnRow } from '@/features/components/aiOrdering/conversationTurnRow';

import { handleAdminFailure } from '../adminFailureFeedback';
import { createAdminAiOrderingConversationDetailPageCommands } from './aiOrderingConversationDetailPage.commands';

function createContext() {
  const { actions, store } = createAdminAiOrderingConversationsRuntime();

  return {
    commands: createAdminAiOrderingConversationDetailPageCommands(actions),
    store,
  };
}

export function useAdminAiOrderingConversationDetailPageVM() {
  const [{ commands, store }] = useState(createContext);
  const { storeId, conversationId } = useParams<{
    storeId: string;
    conversationId: string;
  }>();

  const detail = useStore(store, (state) => state.detail);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const load = useCallback(async () => {
    if (!storeId || !conversationId) return;

    const result = await commands.loadConversation(storeId, conversationId);

    if (result.status === 'failed') {
      handleAdminFailure(result);
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

  return {
    // The breadcrumb links back, so there is no handler to hand the view.
    storeId: storeId ?? '',
    conversationId: detail?.id ?? conversationId ?? '',
    participantId: detail?.participantId ?? '',
    summary: detail?.summary ?? null,
    /**
     * The unchanging opening of the prompt, once per distinct text.
     *
     * Empty for a conversation whose turns were all recorded before preludes
     * were stored — which reads the same as "not sent", and is why the page
     * says so rather than leaving a blank space.
     */
    promptPreludes: detail?.promptPreludes ?? [],
    turns,
    degradedTurnCount: turns.filter((turn) => turn.wasDegraded).length,
    isLoading,
    error,
    retry: load,
  };
}
