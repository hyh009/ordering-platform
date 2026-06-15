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
  /** Keeps the `guest` prefix to match the backend DTO concept (`guestToken`), not the UI feature name. */
  guestSession() {
    return '/v1/public/guest/session';
  },
  storeFrontCart() {
    return '/v1/public/guest/cart';
  },
  storeFrontCartItems() {
    return '/v1/public/guest/cart/items';
  },
  storeFrontCartItemDetail(itemId: string) {
    return `/v1/public/guest/cart/items/${encodeURIComponent(itemId)}`;
  },
  storeFrontCartLeave() {
    return '/v1/public/guest/cart/leave';
  },
  storeFrontCartSubmit() {
    return '/v1/public/guest/cart/submit';
  },
  storeFrontOrder() {
    return '/v1/public/guest/order';
  },
  storeFrontOrderBatches() {
    return '/v1/public/guest/order/batches';
  },
  storeFrontOrderStream() {
    return '/v1/public/guest/order/stream';
  },
} as const;
