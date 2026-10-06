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
  /**
   * What the model answered, formatted for reading.
   *
   * Flattened here rather than in the view because turning arguments into
   * readable JSON is a presentation decision about data, which is the row's
   * job; the view only decides whether to reveal it. Absent when the turn
   * recorded no recognizable output.
   */
  modelOutput?: {
    toolNames: string[];
    /** Pretty-printed tool arguments, in call order. */
    toolArgs: { name: string; json: string }[];
    text: string;
  };
  /**
   * How the turn was reached: what the model was given for this turn, then
   * every call it took. More than one call means an earlier answer was refused,
   * and `feedback` is what the model was told about it.
   */
  modelTrace?: {
    currentTurn: string;
    calls: {
      toolNames: string[];
      feedback?: string;
      toolArgs: { name: string; json: string }[];
      text: string;
      error?: string;
    }[];
  };
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

/**
 * Tool arguments as text.
 *
 * `JSON.stringify` can return `undefined` (for a function or a bare
 * `undefined`) and throws on a circular structure. Neither should be able to
 * blank out a review page, so both land on a placeholder.
 */
function formatArgs(args: unknown): string {
  try {
    return JSON.stringify(args, null, 2) ?? String(args);
  } catch {
    return '[unserializable]';
  }
}

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

  if (turn.modelOutput) {
    row.modelOutput = {
      toolNames: turn.modelOutput.toolCalls.map((call) => call.name),
      toolArgs: turn.modelOutput.toolCalls.map((call) => ({
        name: call.name,
        json: formatArgs(call.args),
      })),
      text: turn.modelOutput.text,
    };
  }

  if (turn.modelTrace) {
    row.modelTrace = {
      currentTurn: turn.modelTrace.currentTurn,
      calls: turn.modelTrace.calls.map((call) => ({
        toolNames: call.toolNames,
        ...(call.feedback !== undefined ? { feedback: call.feedback } : {}),
        toolArgs: (call.output?.toolCalls ?? []).map((toolCall) => ({
          name: toolCall.name,
          json: formatArgs(toolCall.args),
        })),
        text: call.output?.text ?? '',
        ...(call.error !== undefined ? { error: call.error } : {}),
      })),
    };
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
