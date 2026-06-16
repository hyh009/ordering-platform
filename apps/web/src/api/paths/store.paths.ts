export const merchantStorePaths = {
  list: '/v1/merchant/stores',
  detail(storeId: string) {
    return `/v1/merchant/stores/${encodeURIComponent(storeId)}`;
  },
  images(storeId: string) {
    return `/v1/merchant/stores/${encodeURIComponent(storeId)}/images`;
  },
};
