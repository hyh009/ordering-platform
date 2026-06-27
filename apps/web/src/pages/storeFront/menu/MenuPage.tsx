import { useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { ProductCard } from '@/features/storeFront/components/ProductCard';
import type { TagDisplay } from '@/features/storeFront/components/ProductCard';
import { StorefrontErrorView } from '@/features/storeFront/components/StorefrontErrorView';
import { StorefrontLoadingView } from '@/features/storeFront/components/StorefrontLoadingView';
import { StorefrontPageHeader } from '@/features/storeFront/components/StorefrontPageHeader';
import { useLocalizedText } from '@/features/storeFront/components/useLocalizedText';
import type { PublicModifier } from '@/models/storeFrontMenu';
import { MenuCategoryTabs } from './MenuCategoryTabs';
import { MenuStatusBanner } from './MenuStatusBanner';
import { ProductConfigSheet } from './ProductConfigSheet';
import { useMenuPageVM } from './useMenuPageVM';
import { useScrollSpyTabs } from './useScrollSpyTabs';

export function MenuPage() {
  const vm = useMenuPageVM();
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();

  // Localized category tabs; memoized so labels aren't re-localized each render.
  const tabs = useMemo(
    () =>
      vm.categoryTabs.map((tab) => ({
        key: tab.key,
        label: tab.category
          ? localize(tab.category.name)
          : tDefault('guest.menu.other', 'Other'),
      })),
    [vm.categoryTabs, localize, tDefault],
  );

  // Pure-UI scroll behavior; the VM only supplies the ordered section keys.
  const {
    bindHeader,
    bindTabs,
    bindSection,
    scrollToCategory,
    activeKey,
    headerHeight,
    pinnedHeight,
  } = useScrollSpyTabs(tabs.map((tab) => tab.key));

  // A load error blocks the page outright (store+menu failed, or — when open —
  // the session resume failed, since ordering needs a session). Otherwise the
  // first load shows the spinner until the menu arrives.
  if (vm.error || (vm.isLoading && vm.categoryGroups.length === 0)) {
    return (
      <div className="flex flex-1 flex-col">
        <StorefrontPageHeader
          sticky
          left={StorefrontPageHeader.Left.Back}
          middle={StorefrontPageHeader.Middle.Title}
          right={StorefrontPageHeader.Right.Logo}
          title={vm.store ? localize(vm.store.displayName) : undefined}
          onBack={vm.goBack}
          logoUrl={vm.store?.logoUrl}
          logoAlt={vm.store ? localize(vm.store.displayName) : undefined}
        />
        {vm.error ? (
          <StorefrontErrorView message={vm.error} onRetry={vm.retry} />
        ) : (
          <StorefrontLoadingView />
        )}
      </div>
    );
  }

  const openModifiers: PublicModifier[] = vm.openProduct
    ? vm.openProduct.modifierIds
        .map((id) => vm.modifierMap.get(id))
        .filter((modifier): modifier is PublicModifier => Boolean(modifier))
    : [];

  const openAllergens: string[] = vm.openProduct
    ? (vm.openProduct.allergenIds ?? [])
        .map((id) => vm.allergenMap.get(id))
        .filter((a) => a !== undefined)
        .map((a) => localize(a.name))
        .filter((name) => name.length > 0)
    : [];

  return (
    <div className="flex flex-1 flex-col">
      <header
        ref={bindHeader}
        className="sticky top-0 z-sticky border-b border-storefront-border bg-storefront-bg"
      >
        <StorefrontPageHeader
          left={StorefrontPageHeader.Left.Back}
          middle={StorefrontPageHeader.Middle.Title}
          right={StorefrontPageHeader.Right.Logo}
          title={vm.store ? localize(vm.store.displayName) : undefined}
          onBack={vm.goBack}
          logoUrl={vm.store?.logoUrl}
          logoAlt={vm.store ? localize(vm.store.displayName) : undefined}
        />
        {!vm.isOpen ? (
          <p className="px-4 pb-3 text-center text-sm text-storefront-text-muted">
            {tDefault(
              'guest.menu.closed',
              'The store is closed. You can browse but not order.',
            )}
          </p>
        ) : null}
      </header>

      <div className="flex-1 bg-storefront-bg pb-20">
        {vm.orderBanner.mode !== 'none' ? (
          <div className="p-4 pb-2">
            {vm.orderBanner.mode === 'adding' ? (
              <MenuStatusBanner
                mode="adding"
                orderNumber={vm.orderBanner.orderNumber}
              />
            ) : (
              <MenuStatusBanner
                mode="invite"
                joinCode={
                  vm.orderBanner.mode === 'invite'
                    ? vm.orderBanner.joinCode
                    : ''
                }
                onInvite={vm.goToInvite}
              />
            )}
          </div>
        ) : null}

        {tabs.length > 1 ? (
          <div
            ref={bindTabs}
            style={{ top: headerHeight }}
            className="sticky z-raised border-b border-storefront-border bg-storefront-bg"
          >
            <MenuCategoryTabs
              tabs={tabs}
              activeKey={activeKey}
              onSelect={scrollToCategory}
            />
          </div>
        ) : null}

        <div className="space-y-6 p-4">
          {vm.categoryGroups.map((group) => {
            const key = group.category?.id ?? 'uncategorized';
            return (
              <section
                key={key}
                ref={bindSection(key)}
                style={{ scrollMarginTop: pinnedHeight }}
              >
                <h2 className="mb-2 font-semibold">
                  {group.category
                    ? localize(group.category.name)
                    : tDefault('guest.menu.other', 'Other')}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {group.products.map((product) => {
                    const tags: TagDisplay[] = (product.tagIds ?? [])
                      .map((id) => vm.tagMap.get(id))
                      .filter((t) => t !== undefined)
                      .map((t) => ({
                        id: t.id,
                        label: localize(t.name),
                        color: t.color,
                      }));
                    const allergens = (product.allergenIds ?? [])
                      .map((id) => vm.allergenMap.get(id))
                      .filter((a) => a !== undefined)
                      .map((a) => localize(a.name))
                      .filter((name) => name.length > 0);
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        tags={tags}
                        allergens={allergens}
                        disabled={!vm.isOpen}
                        onSelect={vm.setOpenProduct}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {vm.cartItemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-sticky bg-gradient-to-t from-storefront-bg from-60% to-transparent px-4 pb-4 pt-14">
          <button
            type="button"
            onClick={vm.goToCart}
            className="mx-auto flex w-full max-w-md sm:max-w-lg lg:max-w-2xl items-center justify-between rounded-full bg-storefront-primary px-5 py-3.5 text-storefront-text shadow-lg transition-opacity hover:opacity-90 active:opacity-80"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} strokeWidth={2} />
              <span className="text-sm font-semibold">
                {vm.cartItemCount} {tDefault('guest.menu.itemCount', '項')}
              </span>
            </div>
            <span className="text-sm font-semibold">
              {tDefault('guest.menu.viewCart', '查看購物車')} →
            </span>
          </button>
        </div>
      ) : null}

      {vm.openProduct ? (
        <ProductConfigSheet
          product={vm.openProduct}
          modifiers={openModifiers}
          allergens={openAllergens}
          isMutating={vm.isMutating}
          onClose={() => vm.setOpenProduct(null)}
          onConfirm={(request) => {
            void vm.addItem(request);
          }}
        />
      ) : null}
    </div>
  );
}
