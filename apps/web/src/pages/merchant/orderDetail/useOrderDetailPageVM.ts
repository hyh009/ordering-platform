import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { tDefault } from '@/app/i18n';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { PATHS } from '@/app/routing/paths';
import { createOrderDetailRuntime } from '@/features/merchant/orders/detail/runtime';
import {
  canCancelOrder,
  canCheckoutOrder,
  canCompleteOrder,
  getNextBatchStatus,
  orderCancelReasons,
} from '@/models/order';
import { handleMerchantFailure } from '@/pages/merchant/merchantFailureFeedback';
import { createOrderDetailPageCommands } from './orderDetailPage.commands';

import type { MerchantCommandFailure } from '@/services/utils/merchantApiError';
import type { OrderCancelReason } from '@/models/order';

/** Shared cancel target: either the whole order or a specific batch. */
type CancelTarget =
  | { kind: 'order' }
  | { kind: 'batch'; batchId: string }
  | null;

function createOrderDetailPageContext() {
  const { actions, store } = createOrderDetailRuntime();
  const commands = createOrderDetailPageCommands(actions);

  return { commands, store };
}

export function useOrderDetailPageVM() {
  const [{ commands, store }] = useState(createOrderDetailPageContext);
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const storeId = useStore(activeStoreStore, (state) => state.storeId);

  const order = useStore(store, (state) => state.order);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);
  const lastLoadedAt = useStore(store, (state) => state.lastLoadedAt);

  // Mutation in-flight guard
  const [mutating, setMutating] = useState(false);

  // Cancel modal state (shared for order + batch)
  const [cancelTarget, setCancelTarget] = useState<CancelTarget>(null);
  const [selectedReasons, setSelectedReasons] = useState<OrderCancelReason[]>(
    [],
  );
  const [cancelNote, setCancelNote] = useState('');

  const load = useCallback(async () => {
    if (!storeId || !orderId) return;
    await commands.loadOrder(storeId, orderId);
  }, [commands, orderId, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => {
    void load();
  }, [load]);

  const goBack = useCallback(() => {
    void navigate(PATHS.MERCHANT.ORDERS);
  }, [navigate]);

  // ── Conflict auto-refresh ───────────────────────────────────────────────────
  // On any conflict failure: reload the order first, then show the error toast.
  // This ensures the merchant sees the latest state before retrying.
  const handleMutationFailure = useCallback(
    (result: MerchantCommandFailure) => {
      if (result.reason === 'conflict') {
        void load();
      }
      handleMerchantFailure(result);
    },
    [load],
  );

  // ── Derived predicates ──────────────────────────────────────────────────────
  const canCancel = order != null && canCancelOrder(order);
  const canCheckout = order != null && canCheckoutOrder(order);
  const canComplete = order != null && canCompleteOrder(order);

  // ── Cancel modal helpers ────────────────────────────────────────────────────
  const openOrderCancel = useCallback(() => {
    setSelectedReasons([]);
    setCancelNote('');
    setCancelTarget({ kind: 'order' });
  }, []);

  const openBatchCancel = useCallback((batchId: string) => {
    setSelectedReasons([]);
    setCancelNote('');
    setCancelTarget({ kind: 'batch', batchId });
  }, []);

  const closeCancelModal = useCallback(() => {
    setCancelTarget(null);
  }, []);

  const toggleReason = useCallback((reason: OrderCancelReason) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
    );
  }, []);

  const isCancelOpen = cancelTarget !== null;

  // Must have ≥1 reason OR a non-empty note
  const canSubmitCancel =
    selectedReasons.length > 0 || cancelNote.trim().length > 0;

  const confirmCancel = useCallback(async () => {
    if (!storeId || !orderId || !order || !cancelTarget) return;
    if (!canSubmitCancel) return;

    setMutating(true);

    const body = {
      reasons: selectedReasons.length > 0 ? selectedReasons : undefined,
      note: cancelNote.trim() || undefined,
      expectedUpdatedAt: order.updatedAt,
    };

    let result;
    if (cancelTarget.kind === 'order') {
      result = await commands.cancelOrder(storeId, orderId, body);
    } else {
      result = await commands.cancelBatch(
        storeId,
        orderId,
        cancelTarget.batchId,
        body,
      );
    }

    setMutating(false);

    if (result.status === 'saved') {
      setCancelTarget(null);
    } else {
      // Close modal on conflict — order just changed underneath us
      if (result.reason === 'conflict') {
        setCancelTarget(null);
      }
      handleMutationFailure(result);
    }
  }, [
    cancelNote,
    cancelTarget,
    canSubmitCancel,
    commands,
    handleMutationFailure,
    order,
    orderId,
    selectedReasons,
    storeId,
  ]);

  // ── Checkout ────────────────────────────────────────────────────────────────
  const checkout = useCallback(async () => {
    if (!storeId || !orderId || !order) return;

    const confirmed = await feedbackCommands.confirm({
      title: tDefault('merchant.orders.checkout.confirmTitle', 'Mark as paid?'),
      message: tDefault(
        'merchant.orders.checkout.confirmMessage',
        'This will mark the order as paid. This action cannot be undone.',
      ),
      confirmLabel: tDefault(
        'merchant.orders.checkout.confirmAction',
        'Mark paid',
      ),
      tone: 'info',
    });

    if (!confirmed) return;

    setMutating(true);
    const result = await commands.checkoutOrder(storeId, orderId, {
      expectedUpdatedAt: order.updatedAt,
    });
    setMutating(false);

    if (result.status === 'failed') {
      handleMutationFailure(result);
    }
  }, [commands, handleMutationFailure, order, orderId, storeId]);

  // ── Complete order ──────────────────────────────────────────────────────────
  const complete = useCallback(async () => {
    if (!storeId || !orderId || !order) return;

    const confirmed = await feedbackCommands.confirm({
      title: tDefault(
        'merchant.orders.complete.confirmTitle',
        'Complete order?',
      ),
      message: tDefault(
        'merchant.orders.complete.confirmMessage',
        'This will mark the order as completed. This action cannot be undone.',
      ),
      confirmLabel: tDefault(
        'merchant.orders.complete.confirmAction',
        'Complete',
      ),
      tone: 'info',
    });

    if (!confirmed) return;

    setMutating(true);
    const result = await commands.completeOrder(storeId, orderId, {
      expectedUpdatedAt: order.updatedAt,
    });
    setMutating(false);

    if (result.status === 'failed') {
      handleMutationFailure(result);
    }
  }, [commands, handleMutationFailure, order, orderId, storeId]);

  // ── Per-batch actions ───────────────────────────────────────────────────────
  const advanceBatch = useCallback(
    async (batchId: string) => {
      if (!storeId || !orderId || !order) return;

      const batch = order.batches.find((b) => b.id === batchId);
      if (!batch) return;

      const next = getNextBatchStatus(batch.status, tDefault);
      if (!next) return;

      // `getNextBatchStatus` only returns 'preparing' | 'ready' | 'served'
      // (never 'pending_confirmation' or 'cancelled'), matching AdvanceBatchStatusRequest.
      const targetStatus = next.status as 'preparing' | 'ready' | 'served';

      setMutating(true);
      const result = await commands.advanceBatchStatus(
        storeId,
        orderId,
        batchId,
        {
          status: targetStatus,
          expectedUpdatedAt: order.updatedAt,
        },
      );
      setMutating(false);

      if (result.status === 'failed') {
        handleMutationFailure(result);
      }
    },
    [commands, handleMutationFailure, order, orderId, storeId],
  );

  return {
    // State
    order,
    isLoading,
    error,
    mutating,
    lastLoadedAt,

    // Navigation
    goBack,
    retry,

    // Order-level predicates
    canCancel,
    canCheckout,
    canComplete,

    // Order-level actions
    checkout,
    complete,

    // Cancel modal
    isCancelOpen,
    cancelTarget,
    selectedReasons,
    cancelNote,
    orderCancelReasons,
    canSubmitCancel,
    openOrderCancel,
    openBatchCancel,
    closeCancelModal,
    toggleReason,
    setCancelNote,
    confirmCancel,

    // Batch actions
    advanceBatch,
  };
}
