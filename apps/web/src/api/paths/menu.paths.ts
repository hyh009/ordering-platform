function storeBase(storeId: string) {
  return `/v1/merchant/stores/${encodeURIComponent(storeId)}`;
}

export const menuPaths = {
  categories(storeId: string) {
    return `${storeBase(storeId)}/categories`;
  },
  categoryDetail(storeId: string, categoryId: string) {
    return `${storeBase(storeId)}/categories/${encodeURIComponent(categoryId)}`;
  },
  categoryReorder(storeId: string) {
    return `${storeBase(storeId)}/categories/reorder`;
  },
  productModifiers(storeId: string) {
    return `${storeBase(storeId)}/product-modifiers`;
  },
  productModifierDetail(storeId: string, productModifierId: string) {
    return `${storeBase(storeId)}/product-modifiers/${encodeURIComponent(productModifierId)}`;
  },
  tags(storeId: string) {
    return `${storeBase(storeId)}/tags`;
  },
  tagDetail(storeId: string, tagId: string) {
    return `${storeBase(storeId)}/tags/${encodeURIComponent(tagId)}`;
  },
} as const;
