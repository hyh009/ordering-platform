import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useStore } from 'zustand';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from '@/app/routing/paths';
import { createOrderListRuntime } from '@/features/merchant/orders/list/runtime';
import type {
  OrderPaymentStatus,
  OrderStatus,
  OrderSummary,
} from '@/models/order';
import { handleMerchantFailure } from '../merchantFailureFeedback';
import { createOrderListPageCommands } from './orderListPage.commands';

const PAGE_PARAM = 'page';
const PAGE_SIZE_PARAM = 'pageSize';
const STATUS_PARAM = 'status';
const PAYMENT_STATUS_PARAM = 'paymentStatus';
const BUSINESS_DATE_PARAM = 'businessDate';
const Q_PARAM = 'q';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function parseIntParam(value: string | null, fallback: number): number {
  const n = value !== null ? parseInt(value, 10) : NaN;
  return isNaN(n) || n < 1 ? fallback : n;
}

function createOrderListPageContext() {
  const { actions, store } = createOrderListRuntime();
  const commands = createOrderListPageCommands(actions);

  return { commands, store };
}

export function useOrderListPageVM() {
  const [{ commands, store }] = useState(createOrderListPageContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseIntParam(searchParams.get(PAGE_PARAM), DEFAULT_PAGE);
  const pageSize = parseIntParam(
    searchParams.get(PAGE_SIZE_PARAM),
    DEFAULT_PAGE_SIZE,
  );
  const statusFilter = (searchParams.get(STATUS_PARAM) ?? '') as
    | OrderStatus
    | '';
  const paymentStatusFilter = (searchParams.get(PAYMENT_STATUS_PARAM) ?? '') as
    | OrderPaymentStatus
    | '';
  const businessDateFilter = searchParams.get(BUSINESS_DATE_PARAM) ?? '';
  const qFilter = searchParams.get(Q_PARAM) ?? '';

  const storeId = useStore(activeStoreStore, (state) => state.storeId);

  const orders = useStore(store, (state) => state.orders);
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
          // Reset to page 1 when filters change
          if (param !== PAGE_PARAM) params.delete(PAGE_PARAM);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => setParam(PAGE_PARAM, String(nextPage)),
    [setParam],
  );

  const setStatusFilter = useCallback(
    (next: OrderStatus | '') => setParam(STATUS_PARAM, next),
    [setParam],
  );

  const setPaymentStatusFilter = useCallback(
    (next: OrderPaymentStatus | '') => setParam(PAYMENT_STATUS_PARAM, next),
    [setParam],
  );

  const setBusinessDateFilter = useCallback(
    (next: string) => setParam(BUSINESS_DATE_PARAM, next),
    [setParam],
  );

  const setQFilter = useCallback(
    (next: string) => setParam(Q_PARAM, next),
    [setParam],
  );

  const loadOrders = useCallback(async () => {
    if (!storeId) return;

    const result = await commands.loadOrders(storeId, {
      page,
      pageSize,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(paymentStatusFilter ? { paymentStatus: paymentStatusFilter } : {}),
      ...(businessDateFilter ? { businessDate: businessDateFilter } : {}),
      ...(qFilter ? { q: qFilter } : {}),
    });

    if (result.status === 'failed') {
      handleMerchantFailure(result);
    }
  }, [
    commands,
    storeId,
    page,
    pageSize,
    statusFilter,
    paymentStatusFilter,
    businessDateFilter,
    qFilter,
  ]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const retry = useCallback(() => {
    void loadOrders();
  }, [loadOrders]);

  const openOrder = useCallback(
    (order: OrderSummary) => {
      void navigate(PATHS.MERCHANT.ORDER_DETAIL_BUILD(order.id));
    },
    [navigate],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    businessDateFilter,
    error,
    isLoading,
    openOrder,
    orders,
    page,
    pageSize,
    paymentStatusFilter,
    qFilter,
    retry,
    setBusinessDateFilter,
    setPage,
    setPaymentStatusFilter,
    setQFilter,
    setStatusFilter,
    statusFilter,
    total,
    totalPages,
  };
}
