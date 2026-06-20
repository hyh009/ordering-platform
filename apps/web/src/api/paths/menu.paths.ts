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
  products(storeId: string) {
    return `${storeBase(storeId)}/products`;
  },
  productDetail(storeId: string, productId: string) {
    return `${storeBase(storeId)}/products/${encodeURIComponent(productId)}`;
  },
  productSoldOut(storeId: string, productId: string) {
    return `${storeBase(storeId)}/products/${encodeURIComponent(productId)}/sold-out`;
  },
  productImages(storeId: string) {
    return `${storeBase(storeId)}/products/images`;
  },
  tags(storeId: string) {
    return `${storeBase(storeId)}/tags`;
  },
  tagDetail(storeId: string, tagId: string) {
    return `${storeBase(storeId)}/tags/${encodeURIComponent(tagId)}`;
  },
} as const;
