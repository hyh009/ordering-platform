import { useMemo } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { OrderTotals } from '@/features/guest/components/OrderTotals';
import { useLocalizedText } from '@/features/guest/components/useLocalizedText';
import type { CartItem } from '@/models/cart';
import { Button } from '@/shared/components/ui/button';
import { formatPrice } from '@/shared/utils/money';
import { useCartPageVM } from './useCartPageVM';

export function CartPage() {
  const vm = useCartPageVM();
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();

  const groups = useMemo(() => {
    const byParticipant = new Map<string, CartItem[]>();
    for (const item of vm.cart?.items ?? []) {
      const key = item.addedByParticipantId ?? 'unknown';
      byParticipant.set(key, [...(byParticipant.get(key) ?? []), item]);
    }
    return [...byParticipant.entries()];
  }, [vm.cart]);

  if (!vm.cart) {
    return (
      <p className="p-6 text-center text-muted-foreground">
        {vm.isLoading
          ? tDefault('common.loading', 'Loading…')
          : tDefault('guest.cart.empty', 'Your cart is empty.')}
      </p>
    );
  }

  const isEmpty = vm.cart.items.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background p-4">
        <h1 className="text-lg font-bold">
          {tDefault('guest.cart.title', 'Your cart')}
        </h1>
        <Button variant="ghost" size="sm" onClick={vm.goToMenu}>
          {tDefault('guest.cart.addMore', 'Add more')}
        </Button>
      </header>

      <div className="flex-1 space-y-6 p-4 pb-28">
        {isEmpty ? (
          <p className="text-center text-muted-foreground">
            {tDefault('guest.cart.empty', 'Your cart is empty.')}
          </p>
        ) : (
          groups.map(([participantId, items]) => {
            const name = items[0]?.participantDisplayName;
            return (
              <section key={participantId}>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                  {name ?? tDefault('guest.cart.guest', 'Guest')}
                </h2>
                <div className="space-y-3">
                  {items.map((item) => {
                    const editable = vm.isOwnItem(item);
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="flex justify-between gap-2">
                          <p className="font-medium">
                            {localize(item.productName)}
                          </p>
                          <p className="font-semibold">
                            {formatPrice(item.totalItemPrice)}
                          </p>
                        </div>
                        {item.selectedOptions.length > 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.selectedOptions
                              .map((option) => localize(option.optionName))
                              .join(', ')}
                          </p>
                        ) : null}
                        {item.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.notes}
                          </p>
                        ) : null}

                        {editable ? (
                          <div className="mt-2 flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={vm.isMutating || item.quantity <= 1}
                              onClick={() => {
                                void vm.changeQuantity(item, item.quantity - 1);
                              }}
                            >
                              −
                            </Button>
                            <span className="w-6 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={vm.isMutating || item.quantity >= 99}
                              onClick={() => {
                                void vm.changeQuantity(item, item.quantity + 1);
                              }}
                            >
                              +
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto"
                              disabled={vm.isMutating}
                              onClick={() => {
                                void vm.removeItem(item);
                              }}
                            >
                              {tDefault('guest.cart.remove', 'Remove')}
                            </Button>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {tDefault('guest.cart.quantity', 'Qty')}:{' '}
                            {item.quantity}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        {vm.joinCode ? (
          <section className="rounded-lg border border-dashed border-border p-3">
            <h2 className="text-sm font-semibold">
              {tDefault('guest.cart.invite', 'Invite others')}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {tDefault('guest.cart.inviteCode', 'Share code')}:{' '}
              <span className="font-mono font-semibold">{vm.joinCode}</span>
            </p>
            {vm.inviteLink ? (
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {vm.inviteLink}
              </p>
            ) : null}
          </section>
        ) : null}

        {!isEmpty ? (
          <OrderTotals
            subtotal={vm.cart.subtotal}
            serviceFeeAmount={vm.cart.serviceFeeAmount}
            totalAmount={vm.cart.totalAmount}
          />
        ) : null}
      </div>

      {!isEmpty ? (
        <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-border bg-background p-3">
          <Button
            className="w-full"
            disabled={vm.isMutating}
            onClick={() => {
              void vm.submit();
            }}
          >
            {tDefault('guest.cart.submit', 'Submit order')} ·{' '}
            {formatPrice(vm.cart.totalAmount)}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
