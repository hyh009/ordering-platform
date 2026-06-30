import { ChevronRight } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { StorefrontErrorView } from '@/features/storeFront/components/StorefrontErrorView';
import { StorefrontLoadingView } from '@/features/storeFront/components/StorefrontLoadingView';
import { StorefrontPageHeader } from '@/features/storeFront/components/StorefrontPageHeader';
import { useLocalizedText } from '@/features/storeFront/components/useLocalizedText';
import { getOrderStatusLabel } from '@/models/order';
import { getStoreOrderTypeLabel } from '@/models/store';
import { formatPrice } from '@/shared/utils/money';
import { useOrderHistoryPageVM } from './useOrderHistoryPageVM';

export function OrderHistoryPage() {
  const vm = useOrderHistoryPageVM();
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();
  const storeName = vm.store ? localize(vm.store.displayName) : undefined;
  const title = tDefault('guest.orderHistory.title', 'Recent orders');

  return (
    <div className="flex flex-1 flex-col bg-storefront-bg">
      <StorefrontPageHeader
        sticky
        left={StorefrontPageHeader.Left.Back}
        middle={StorefrontPageHeader.Middle.Title}
        right={StorefrontPageHeader.Right.Logo}
        title={title}
        onBack={vm.goBack}
        logoUrl={vm.store?.logoUrl}
        logoAlt={storeName}
      />

      {vm.isLoading ? (
        <StorefrontLoadingView />
      ) : vm.error ? (
        <StorefrontErrorView message={vm.error} onRetry={vm.retry} />
      ) : vm.items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-sm text-center">
            <h2 className="text-lg font-semibold text-storefront-text">
              {tDefault('guest.orderHistory.empty', 'No recent orders found.')}
            </h2>
            <p className="mt-2 text-sm text-storefront-text-muted">
              {tDefault(
                'guest.orderHistory.emptyDescription',
                'Orders from this browser in the last 24 hours will appear here.',
              )}
            </p>
          </div>
        </div>
      ) : (
        <main className="flex-1 px-4 pb-10">
          <div className="mx-auto w-full max-w-2xl">
            <div className="py-5">
              <p className="text-sm text-storefront-text-muted">
                {tDefault(
                  'guest.orderHistory.retention',
                  'Orders from this browser in the last 24 hours',
                )}
              </p>
            </div>

            <ul className="space-y-3">
              {vm.items.map(({ order }) => (
                <li key={order.id}>
                  <button
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-storefront-border bg-storefront-bg px-4 py-4 text-left shadow-sm transition-colors hover:bg-storefront-border/30"
                    type="button"
                    onClick={() => vm.openOrder(order.id)}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-lg font-semibold text-storefront-text">
                          #{order.displayNumber}
                        </p>
                        <span className="rounded-full bg-storefront-secondary/15 px-2.5 py-0.5 text-xs font-medium text-storefront-text">
                          {getOrderStatusLabel(order.status, tDefault)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-storefront-text-muted">
                        {new Date(order.createdAt).toLocaleString()} ·{' '}
                        {getStoreOrderTypeLabel(order.orderType, tDefault)}
                      </p>
                      <p className="mt-2 text-base font-semibold text-storefront-text">
                        {formatPrice(order.totalAmount)}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-storefront-text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </main>
      )}
    </div>
  );
}
