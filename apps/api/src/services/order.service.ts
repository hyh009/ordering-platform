import { toOrderDto, toOrderSummaryDto } from '@src/models/order/mapper';
import { orderRepository } from '@src/repositories/order/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import { NotFoundError } from '@src/utils/errors';

import type {
  GetMerchantOrderSuccessResponse,
  ListOrdersQuery,
  ListOrdersSuccessResponse,
} from '@repo/shared';

type ListOrdersResult = ListOrdersSuccessResponse['data'];
type GetOrderResult = GetMerchantOrderSuccessResponse['data'];

export class OrderService {
  public async listOrders(
    storeId: string,
    query: ListOrdersQuery,
  ): Promise<ListOrdersResult> {
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const [orders, total] = await Promise.all([
      orderRepository.listByStore({
        storeId,
        status: query.status,
        paymentStatus: query.paymentStatus,
        businessDate: query.businessDate,
        q: query.q,
        skip,
        limit: pageSize,
      }),
      orderRepository.countByStore({
        storeId,
        status: query.status,
        paymentStatus: query.paymentStatus,
        businessDate: query.businessDate,
        q: query.q,
      }),
    ]);

    return {
      orders: orders.map(toOrderSummaryDto),
      total,
      page,
      pageSize,
    };
  }

  public async getOrder(
    storeId: string,
    orderId: string,
  ): Promise<GetOrderResult> {
    const order = await orderRepository.findById(orderId);

    if (!order || order.storeId !== storeId) {
      throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
    }

    return { order: toOrderDto(order) };
  }
}

export function createOrderService() {
  return new OrderService();
}

export const orderService = createOrderService();
