import { useMemo } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { ProductCard } from '@/features/storeFront/components/ProductCard';
import { StorefrontPageHeader } from '@/features/storeFront/components/StorefrontPageHeader';
import { useLocalizedText } from '@/features/storeFront/components/useLocalizedText';
import type { PublicModifier } from '@/models/storeFrontMenu';
import { Button } from '@/shared/components/ui/button';
import { formatPrice } from '@/shared/utils/money';
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

  if (vm.isLoading && vm.categoryGroups.length === 0) {
    return (
      <p className="p-6 text-center text-muted-foreground">
        {tDefault('common.loading', 'Loading…')}
      </p>
    );
  }

  const openModifiers: PublicModifier[] = vm.openProduct
    ? vm.openProduct.modifierIds
        .map((id) => vm.modifierMap.get(id))
        .filter((modifier): modifier is PublicModifier => Boolean(modifier))
    : [];

  return (
    <div className="flex flex-1 flex-col">
      <header
        ref={bindHeader}
        className="sticky top-0 z-20 border-b border-storefront-border bg-storefront-bg"
      >
        <StorefrontPageHeader
          left={StorefrontPageHeader.Left.Back}
          middle={StorefrontPageHeader.Middle.Title}
          right={StorefrontPageHeader.Right.Logo}
          title={vm.store ? localize(vm.store.displayName) : undefined}
          onBack={vm.goToLanding}
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

      <div className="flex-1 pb-24">
        {vm.orderBanner.mode !== 'none' ? (
          <div className="p-4 pb-2">
            {vm.orderBanner.mode === 'adding' ? (
              <MenuStatusBanner
                mode="adding"
                orderNumber={vm.orderBanner.orderNumber}
              />
            ) : (
              <MenuStatusBanner mode="invite" onInvite={vm.goToInvite} />
            )}
          </div>
        ) : null}

        {tabs.length > 1 ? (
          <div
            ref={bindTabs}
            style={{ top: headerHeight }}
            className="sticky z-10 border-b border-storefront-border bg-storefront-bg"
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
                <div className="space-y-2">
                  {group.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      disabled={!vm.isOpen}
                      onSelect={vm.setOpenProduct}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {vm.cartItemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-border bg-background p-3">
          <Button className="w-full justify-between" onClick={vm.goToCart}>
            <span>
              {tDefault('guest.menu.viewCart', 'View cart')} ({vm.cartItemCount}
              )
            </span>
            <span>{formatPrice(vm.cartTotal)}</span>
          </Button>
        </div>
      ) : null}

      {vm.openProduct ? (
        <ProductConfigSheet
          product={vm.openProduct}
          modifiers={openModifiers}
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
