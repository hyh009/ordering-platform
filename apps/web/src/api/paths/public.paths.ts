function publicStoreBase(storeId: string) {
  return `/v1/public/stores/${encodeURIComponent(storeId)}`;
}

export const publicPaths = {
  store(storeId: string) {
    return publicStoreBase(storeId);
  },
  menu(storeId: string) {
    return `${publicStoreBase(storeId)}/menu`;
  },
  carts(storeId: string) {
    return `${publicStoreBase(storeId)}/carts`;
  },
  cartsJoin(storeId: string) {
    return `${publicStoreBase(storeId)}/carts/join`;
  },
  guestSession() {
    return '/v1/public/guest/session';
  },
  guestCart() {
    return '/v1/public/guest/cart';
  },
  guestCartItems() {
    return '/v1/public/guest/cart/items';
  },
  guestCartItemDetail(itemId: string) {
    return `/v1/public/guest/cart/items/${encodeURIComponent(itemId)}`;
  },
  guestCartLeave() {
    return '/v1/public/guest/cart/leave';
  },
  guestCartSubmit() {
    return '/v1/public/guest/cart/submit';
  },
  guestOrder() {
    return '/v1/public/guest/order';
  },
  guestOrderBatches() {
    return '/v1/public/guest/order/batches';
  },
  guestOrderStream() {
    return '/v1/public/guest/order/stream';
  },
} as const;
