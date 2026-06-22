import { useAppTranslation } from '@/app/i18n';
import { OrderTotals } from '@/features/storeFront/components/OrderTotals';
import { ParticipantOrderSection } from '@/features/storeFront/components/ParticipantOrderSection';
import { StorefrontPageHeader } from '@/features/storeFront/components/StorefrontPageHeader';
import { formatPrice } from '@/shared/utils/money';
import { useCartPageVM } from './useCartPageVM';

export function CartPage() {
  const vm = useCartPageVM();
  const { tDefault } = useAppTranslation();

  if (!vm.cart) {
    return (
      <div className="flex flex-1 flex-col">
        <StorefrontPageHeader
          sticky
          left={StorefrontPageHeader.Left.Back}
          middle={StorefrontPageHeader.Middle.Title}
          title={tDefault('guest.cart.title', '購物車')}
          onBack={vm.goToMenu}
        />
        <p className="p-6 text-center text-storefront-text-muted">
          {vm.isLoading
            ? tDefault('common.loading', 'Loading…')
            : tDefault('guest.cart.empty', 'Your cart is empty.')}
        </p>
      </div>
    );
  }

  const isEmpty = vm.totalItems === 0;

  return (
    <div className="flex flex-1 flex-col">
      <StorefrontPageHeader
        sticky
        left={StorefrontPageHeader.Left.Back}
        middle={StorefrontPageHeader.Middle.Title}
        title={tDefault('guest.cart.title', '購物車')}
        onBack={vm.goToMenu}
      />

      <div className="flex-1 bg-storefront-bg pb-28">
        <div className="divide-y divide-storefront-border px-4">
          {vm.participantGroups.map((group) => (
            <ParticipantOrderSection
              key={group.participant.id}
              participant={group.participant}
              items={group.items}
              isCurrentUser={group.isCurrentUser}
              isMutating={vm.isMutating}
              onChangeQuantity={vm.changeQuantity}
              onRemove={vm.removeItem}
            />
          ))}
        </div>

        {!isEmpty ? (
          <div className="mx-4 mt-4 border-t border-storefront-border pt-4 pb-2">
            <OrderTotals
              subtotal={vm.cart.subtotal}
              serviceFeeAmount={vm.cart.serviceFeeAmount}
              serviceFeeRate={vm.cart.serviceFeeRate}
              totalAmount={vm.cart.totalAmount}
            />
          </div>
        ) : null}
      </div>

      {!isEmpty ? (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-storefront-bg from-60% to-transparent px-4 pb-4 pt-14">
          <button
            type="button"
            disabled={vm.isMutating}
            className="mx-auto flex w-full max-w-md items-center justify-between rounded-full bg-storefront-primary px-5 py-3.5 text-storefront-text shadow-lg transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60 sm:max-w-lg lg:max-w-2xl"
            onClick={() => {
              void vm.submit();
            }}
          >
            <div className="text-left">
              <p className="text-sm font-semibold">
                {formatPrice(vm.cart.totalAmount)}
              </p>
              <p className="text-xs opacity-75">
                {vm.totalItems} {tDefault('guest.cart.items', '項')} ·{' '}
                {vm.participantGroups.length}{' '}
                {tDefault('guest.cart.participants', '人')}
              </p>
            </div>
            <span className="text-sm font-semibold">
              {tDefault('guest.cart.submit', '送出訂單')} →
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
