import { ProductCard } from '@/features/storeFront/components/ProductCard';

import type { TagDisplay } from '@/features/storeFront/components/ProductCard';

import type { PublicProduct } from '@/models/storeFrontMenu';

import { bindWheelToScrollX } from './wheelToScrollX';

/**
 * The products one reply showed, as cards the guest can scroll and open.
 *
 * Horizontal, because the set this exists for is a whole category — twelve
 * kinds of one dish was the case that produced it, and twelve is more than a
 * question may offer and more than a panel column can hold. A row scrolls; a
 * list cut short to fit hides part of the answer.
 *
 * The cards are the menu page's own, rendered from the same menu data, so
 * nothing the assistant says about a product can disagree with the product
 * beside it. Opening one hands it back up to the page, which opens the
 * configuration sheet it already opens from the menu: the guest adds to the
 * cart themselves, and the assistant proposed nothing.
 */
export function AssistantProductRow({
  products,
  describeProduct,
  isStoreOpen,
  onOpenProduct,
}: {
  products: PublicProduct[];
  describeProduct: (product: PublicProduct) => {
    tags: TagDisplay[];
    allergens: string[];
  };
  /** The menu grid disables its cards when the store is shut; so does this. */
  isStoreOpen: boolean;
  onOpenProduct: (product: PublicProduct) => void;
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    // The scrollbar is hidden the way the category tabs hide theirs: a desktop
    // track drawn under four cards reads as a divider in the transcript, and
    // the cards already show they continue by being cut off at the edge. The
    // wheel is mapped sideways so the one input that cannot swipe can still
    // reach them.
    <div
      ref={bindWheelToScrollX}
      className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {products.map((product) => {
        const { tags, allergens } = describeProduct(product);

        return (
          <div key={product.id} className="w-44 shrink-0 snap-start">
            <ProductCard
              product={product}
              tags={tags}
              allergens={allergens}
              disabled={!isStoreOpen}
              showImage={false}
              onSelect={onOpenProduct}
            />
          </div>
        );
      })}
    </div>
  );
}
