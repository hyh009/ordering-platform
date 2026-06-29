function storeBase(storeId: string) {
  return `/v1/merchant/stores/${encodeURIComponent(storeId)}`;
}

function orderBase(storeId: string, orderId: string) {
  return `${storeBase(storeId)}/orders/${encodeURIComponent(orderId)}`;
}

export const orderPaths = {
  orders(storeId: string) {
    return `${storeBase(storeId)}/orders`;
  },
  orderDetail(storeId: string, orderId: string) {
    return orderBase(storeId, orderId);
  },
  orderCancel(storeId: string, orderId: string) {
    return `${orderBase(storeId, orderId)}/cancel`;
  },
  orderCheckout(storeId: string, orderId: string) {
    return `${orderBase(storeId, orderId)}/checkout`;
  },
  orderComplete(storeId: string, orderId: string) {
    return `${orderBase(storeId, orderId)}/complete`;
  },
  orderBatchStatus(storeId: string, orderId: string, batchId: string) {
    return `${orderBase(storeId, orderId)}/batches/${encodeURIComponent(batchId)}/status`;
  },
  orderBatchCancel(storeId: string, orderId: string, batchId: string) {
    return `${orderBase(storeId, orderId)}/batches/${encodeURIComponent(batchId)}/cancel`;
  },
} as const;
