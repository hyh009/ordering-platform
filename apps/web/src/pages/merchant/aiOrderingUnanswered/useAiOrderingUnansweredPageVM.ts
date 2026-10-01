import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useStore } from 'zustand';

import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { createAiOrderingUnansweredRuntime } from '@/features/merchant/aiOrdering/unanswered/runtime';
import { aiOrderingUnansweredReasons } from '@/models/aiOrdering';

import { handleMerchantFailure } from '../merchantFailureFeedback';
import { createAiOrderingUnansweredPageCommands } from './aiOrderingUnansweredPage.commands';

import type {
  AiOrderingUnansweredEntry,
  AiOrderingUnansweredReason,
} from '@/models/aiOrdering';

const PAGE_PARAM = 'page';
const REASON_PARAM = 'reason';
const DEFAULT_PAGE = 1;
const PAGE_SIZE = 20;

/**
 * One unanswered question as the table reads it.
 *
 * `productId` is carried through rather than flattened away: an entry that names
 * a product is the actionable kind — it says which product's description was not
 * good enough to answer the guest.
 */
export type AiOrderingUnansweredRow = {
  id: string;
  conversationId: string;
  message: string;
  reply: string;
  reason: AiOrderingUnansweredReason;
  productId: string | null;
  /** True when the entry points at a product the merchant can go and fix. */
  isActionable: boolean;
  createdAt: string;
};

function toRow(entry: AiOrderingUnansweredEntry): AiOrderingUnansweredRow {
  return {
    id: `${entry.conversationId}:${entry.turnId}`,
    conversationId: entry.conversationId,
    message: entry.message,
    reply: entry.reply,
    reason: entry.reason,
    productId: entry.productId ?? null,
    isActionable:
      entry.reason === 'missing_product_info' && entry.productId !== undefined,
    createdAt: entry.createdAt,
  };
}

function parsePage(value: string | null): number {
  const parsed = value !== null ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isNaN(parsed) || parsed < 1 ? DEFAULT_PAGE : parsed;
}

function parseReason(value: string | null): AiOrderingUnansweredReason | '' {
  return aiOrderingUnansweredReasons.includes(
    value as AiOrderingUnansweredReason,
  )
    ? (value as AiOrderingUnansweredReason)
    : '';
}

function createContext() {
  const { actions, store } = createAiOrderingUnansweredRuntime();

  return { commands: createAiOrderingUnansweredPageCommands(actions), store };
}

export function useAiOrderingUnansweredPageVM() {
  const [{ commands, store }] = useState(createContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const reason = parseReason(searchParams.get(REASON_PARAM));

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const entries = useStore(store, (state) => state.entries);
  const total = useStore(store, (state) => state.total);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const setParam = useCallback(
    (param: string, value: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (value) params.set(param, value);
          else params.delete(param);
          // A filter change invalidates the page number it was read with.
          if (param !== PAGE_PARAM) params.delete(PAGE_PARAM);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      setParam(PAGE_PARAM, String(nextPage));
    },
    [setParam],
  );

  const setReason = useCallback(
    (next: AiOrderingUnansweredReason | '') => {
      setParam(REASON_PARAM, next);
    },
    [setParam],
  );

  const load = useCallback(async () => {
    if (!storeId) return;

    const result = await commands.loadUnanswered(storeId, {
      page,
      pageSize: PAGE_SIZE,
      ...(reason ? { reason } : {}),
    });

    if (result.status === 'failed') {
      handleMerchantFailure(result);
    }
  }, [commands, page, reason, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => entries.map(toRow), [entries]);

  return {
    rows,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
    pageSize: PAGE_SIZE,
    reason,
    reasons: aiOrderingUnansweredReasons,
    actionableCount: rows.filter((row) => row.isActionable).length,
    isLoading,
    error,
    setPage,
    setReason,
    retry: load,
  };
}
