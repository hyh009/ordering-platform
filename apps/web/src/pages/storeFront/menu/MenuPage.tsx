import { useAppTranslation } from '@/app/i18n';
import { ProductCard } from '@/features/storeFront/components/ProductCard';
import { useLocalizedText } from '@/features/storeFront/components/useLocalizedText';
import type { PublicModifier } from '@/models/storeFrontMenu';
import { Button } from '@/shared/components/ui/button';
import { formatPrice } from '@/shared/utils/money';
import { ProductConfigSheet } from './ProductConfigSheet';
import { useMenuPageVM } from './useMenuPageVM';

export function MenuPage() {
  const vm = useMenuPageVM();
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();

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
      <header className="sticky top-0 z-10 border-b border-border bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">
            {vm.store ? localize(vm.store.displayName) : ''}
          </h1>
          {/* Temporary entry to the Invite page; final placement comes with the
              later Menu refactor. */}
          <Button size="sm" variant="outline" onClick={vm.goToInvite}>
            {tDefault('guest.menu.invite', 'Invite')}
          </Button>
        </div>
        {!vm.isOpen ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {tDefault(
              'guest.menu.closed',
              'The store is closed. You can browse but not order.',
            )}
          </p>
        ) : null}
      </header>

      <div className="flex-1 space-y-6 p-4 pb-24">
        {vm.categoryGroups.map((group) => (
          <section key={group.category?.id ?? 'uncategorized'}>
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
        ))}
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
