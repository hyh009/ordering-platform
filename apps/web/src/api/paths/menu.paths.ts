function storeBase(storeId: string) {
  return `/v1/merchant/stores/${encodeURIComponent(storeId)}`;
}

export const menuPaths = {
  tags(storeId: string) {
    return `${storeBase(storeId)}/tags`;
  },
  tagDetail(storeId: string, tagId: string) {
    return `${storeBase(storeId)}/tags/${encodeURIComponent(tagId)}`;
  },
} as const;
