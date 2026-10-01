import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';

import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from '@/app/routing/paths';
import { createAiOrderingConversationsRuntime } from '@/features/merchant/aiOrdering/conversations/runtime';

import { handleMerchantFailure } from '../merchantFailureFeedback';
import { createAiOrderingConversationDetailPageCommands } from './aiOrderingConversationDetailPage.commands';

import type { AiOrderingReviewTurn } from '@/models/aiOrdering';

/**
 * One turn as the review table reads it.
 *
 * `wasDegraded` is the signal worth scanning for: a turn where the model's
 * operations were dropped, or where it needed a repair that failed, is the
 * evidence that a prompt version needs work.
 */
export type AiOrderingReviewTurnRow = {
  id: string;
  message: string;
  responseType: AiOrderingReviewTurn['response']['type'];
  reply: string;
  versionId: string;
  versionFingerprint: string;
  modelName: string;
  provider: string;
  repairAttempted: boolean;
  repairSucceeded?: boolean;
  droppedOperationCount: number;
  ownershipViolationCount: number;
  wasDegraded: boolean;
  createdAt: string;
};

function toRow(turn: AiOrderingReviewTurn): AiOrderingReviewTurnRow {
  const row: AiOrderingReviewTurnRow = {
    id: turn.id,
    message: turn.message,
    responseType: turn.response.type,
    reply: turn.response.reply,
    versionId: turn.versionId,
    versionFingerprint: turn.versionFingerprint,
    modelName: turn.modelName,
    provider: turn.provider,
    repairAttempted: turn.repairAttempted,
    droppedOperationCount: turn.droppedOperationCount,
    ownershipViolationCount: turn.ownershipViolationCount,
    wasDegraded:
      turn.droppedOperationCount > 0 ||
      turn.ownershipViolationCount > 0 ||
      turn.repairSucceeded === false,
    createdAt: turn.createdAt,
  };

  if (turn.repairSucceeded !== undefined) {
    row.repairSucceeded = turn.repairSucceeded;
  }

  return row;
}

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
    () => (detail ? detail.turns.map(toRow) : []),
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
