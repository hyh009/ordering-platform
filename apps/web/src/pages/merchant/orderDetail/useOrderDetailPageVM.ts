import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from '@/app/routing/paths';
import { createOrderDetailRuntime } from '@/features/merchant/orders/detail/runtime';
import { createOrderDetailPageCommands } from './orderDetailPage.commands';

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

  return {
    error,
    goBack,
    isLoading,
    order,
    retry,
  };
}
