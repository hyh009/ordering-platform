import { ChevronRight } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { getOrderStatusLabel } from '@/models/order';
import { getStoreOrderTypeLabel } from '@/models/store';
import { Button } from '@/shared/components/ui/button';
import { formatPrice } from '@/shared/utils/money';
import { useOrderHistoryPageVM } from './useOrderHistoryPageVM';

export function OrderHistoryPage() {
  const vm = useOrderHistoryPageVM();
  const { tDefault } = useAppTranslation();

  return (
    <div className="flex flex-1 flex-col p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-storefront-text">
            {tDefault('guest.orderHistory.title', 'Recent orders')}
          </h1>
          <p className="text-sm text-storefront-text-muted">
            {tDefault(
              'guest.orderHistory.retention',
              'Orders from this browser in the last 24 hours',
            )}
          </p>
        </div>
        <Button variant="ghost" onClick={vm.goBack}>
          {tDefault('common.back', 'Back')}
        </Button>
      </header>

      {vm.isLoading ? (
        <p className="mt-8 text-center text-storefront-text-muted">
          {tDefault('common.loading', 'Loading…')}
        </p>
      ) : vm.error ? (
        <p className="mt-8 text-center text-storefront-text-muted">
          {vm.error}
        </p>
      ) : vm.items.length === 0 ? (
        <p className="mt-8 text-center text-storefront-text-muted">
          {tDefault('guest.orderHistory.empty', 'No recent orders found.')}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {vm.items.map(({ order }) => (
            <li key={order.id}>
              <button
                className="flex w-full items-center justify-between rounded-xl border border-storefront-border bg-storefront-bg p-4 text-left"
                type="button"
                onClick={() => vm.openOrder(order.id)}
              >
                <div>
                  <p className="font-semibold text-storefront-text">
                    #{order.displayNumber}
                  </p>
                  <p className="mt-1 text-sm text-storefront-text-muted">
                    {new Date(order.createdAt).toLocaleString()} ·{' '}
                    {getStoreOrderTypeLabel(order.orderType, tDefault)}
                  </p>
                  <p className="mt-1 text-sm text-storefront-text-muted">
                    {getOrderStatusLabel(order.status, tDefault)} ·{' '}
                    {formatPrice(order.totalAmount)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-storefront-text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
