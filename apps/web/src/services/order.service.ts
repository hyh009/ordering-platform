import { apiJson } from '@/api';
import { orderPaths } from '@/api/paths/order.paths';
import { orderModel, orderSummaryModel } from '@/models/order';

import type {
  AdvanceBatchStatusRequest,
  CancelBatchRequest,
  CancelOrderRequest,
  CheckoutOrderRequest,
  CompleteOrderRequest,
  GetMerchantOrderSuccessResponse,
  ListOrdersSuccessResponse,
  ListOrdersQuery,
  Order,
  OrderSummary,
} from '@/models/order';

type ListOrdersParams = Partial<
  Pick<
    NonNullable<ListOrdersQuery>,
    'page' | 'pageSize' | 'status' | 'paymentStatus' | 'businessDate' | 'q'
  >
>;

export const merchantOrderService = {
  async listOrders(
    storeId: string,
    params: ListOrdersParams = {},
  ): Promise<{
    orders: OrderSummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.page !== undefined)
      searchParams.set('page', String(params.page));
    if (params.pageSize !== undefined)
      searchParams.set('pageSize', String(params.pageSize));
    if (params.status !== undefined) searchParams.set('status', params.status);
    if (params.paymentStatus !== undefined)
      searchParams.set('paymentStatus', params.paymentStatus);
    if (params.businessDate !== undefined)
      searchParams.set('businessDate', params.businessDate);
    if (params.q !== undefined && params.q.trim().length > 0)
      searchParams.set('q', params.q);

    const qs = searchParams.toString();
    const url = qs
      ? `${orderPaths.orders(storeId)}?${qs}`
      : orderPaths.orders(storeId);

    const response = await apiJson<ListOrdersSuccessResponse>(url);

    const { orders, total, page, pageSize } = response.data;
    return {
      orders: orders.map(orderSummaryModel.deserialize),
      total,
      page,
      pageSize,
    };
  },

  async getOrder(storeId: string, orderId: string): Promise<Order> {
    const response = await apiJson<GetMerchantOrderSuccessResponse>(
      orderPaths.orderDetail(storeId, orderId),
    );

    return orderModel.deserialize(response.data.order);
  },

  async cancelOrder(
    storeId: string,
    orderId: string,
    body: CancelOrderRequest,
  ): Promise<Order> {
    const response = await apiJson<GetMerchantOrderSuccessResponse>(
      orderPaths.orderCancel(storeId, orderId),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    return orderModel.deserialize(response.data.order);
  },

  async checkoutOrder(
    storeId: string,
    orderId: string,
    body: CheckoutOrderRequest,
  ): Promise<Order> {
    const response = await apiJson<GetMerchantOrderSuccessResponse>(
      orderPaths.orderCheckout(storeId, orderId),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    return orderModel.deserialize(response.data.order);
  },

  async completeOrder(
    storeId: string,
    orderId: string,
    body: CompleteOrderRequest,
  ): Promise<Order> {
    const response = await apiJson<GetMerchantOrderSuccessResponse>(
      orderPaths.orderComplete(storeId, orderId),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    return orderModel.deserialize(response.data.order);
  },

  async advanceBatchStatus(
    storeId: string,
    orderId: string,
    batchId: string,
    body: AdvanceBatchStatusRequest,
  ): Promise<Order> {
    const response = await apiJson<GetMerchantOrderSuccessResponse>(
      orderPaths.orderBatchStatus(storeId, orderId, batchId),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    return orderModel.deserialize(response.data.order);
  },

  async cancelBatch(
    storeId: string,
    orderId: string,
    batchId: string,
    body: CancelBatchRequest,
  ): Promise<Order> {
    const response = await apiJson<GetMerchantOrderSuccessResponse>(
      orderPaths.orderBatchCancel(storeId, orderId, batchId),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    return orderModel.deserialize(response.data.order);
  },
};
