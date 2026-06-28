function storeBase(storeId: string) {
  return `/v1/merchant/stores/${encodeURIComponent(storeId)}`;
}

export const orderPaths = {
  orders(storeId: string) {
    return `${storeBase(storeId)}/orders`;
  },
  orderDetail(storeId: string, orderId: string) {
    return `${storeBase(storeId)}/orders/${encodeURIComponent(orderId)}`;
  },
} as const;
