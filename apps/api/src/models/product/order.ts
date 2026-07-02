import type { ProductEntity } from '@src/models/product/model';

/**
 * Applies a category's `productOrder` to its member products (read path).
 *
 * Products whose id appears in `orderedIds` are returned in that order; members
 * not listed in `orderedIds` (e.g. freshly added, not yet reordered) are
 * appended afterwards, preserving the input order — which arrives `createdAt, id`
 * sorted from the repository. Ids in `orderedIds` that are not in `products`
 * (stale/removed members) are ignored.
 *
 * This is the read counterpart to the write-side `buildNormalizedProductOrder`
 * in `category.service`; it never validates or mutates persisted order.
 */
export function sortProductsByCategoryOrder(
  products: ProductEntity[],
  orderedIds: string[] | undefined,
): ProductEntity[] {
  // Older category documents predate `productOrder`; a lean read returns it as
  // undefined (the schema default is not applied), so tolerate that here.
  if (!orderedIds || orderedIds.length === 0) return products;

  const indexById = new Map(orderedIds.map((id, index) => [id, index]));

  return [...products].sort(
    (a, b) =>
      (indexById.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (indexById.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}
