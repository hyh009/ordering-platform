import { useAppTranslation } from '@/app/i18n';
import { OrderTotals } from '@/features/guest/components/OrderTotals';
import { useLocalizedText } from '@/features/guest/components/useLocalizedText';
import {
  getOrderBatchStatusLabel,
  getOrderPaymentStatusLabel,
  getOrderStatusLabel,
} from '@/models/order';
import { Button } from '@/shared/components/ui/button';
import { formatPrice } from '@/shared/utils/money';
import { useOrderTrackingPageVM } from './useOrderTrackingPageVM';

export function OrderTrackingPage() {
  const vm = useOrderTrackingPageVM();
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();

  if (!vm.order) {
    return (
      <p className="p-6 text-center text-muted-foreground">
        {vm.isLoading
          ? tDefault('common.loading', 'Loading…')
          : (vm.error ?? tDefault('guest.order.notFound', 'Order not found.'))}
      </p>
    );
  }

  const { order } = vm;

  return (
    <div className="flex flex-1 flex-col p-4">
      <header className="text-center">
        <p className="text-sm text-muted-foreground">
          {tDefault('guest.order.number', 'Order number')}
        </p>
        <p className="text-5xl font-bold">#{order.displayNumber}</p>
        <p className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">
          {getOrderStatusLabel(order.status, tDefault)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {getOrderPaymentStatusLabel(order.paymentStatus, tDefault)}
          {order.tableNumber
            ? ` · ${tDefault('guest.order.table', 'Table')} ${order.tableNumber}`
            : ''}
        </p>
      </header>

      <div className="mt-6 flex-1 space-y-4">
        {order.batches.map((batch) => (
          <section
            key={batch.id}
            className="rounded-lg border border-border p-3"
          >
            <div className="flex justify-between text-sm font-semibold">
              <span>
                {tDefault('guest.order.batch', 'Batch')} {batch.batchNumber}
              </span>
              <span className="text-muted-foreground">
                {getOrderBatchStatusLabel(batch.status, tDefault)}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {batch.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {localize(item.productName)} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.totalItemPrice)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <OrderTotals
          subtotal={order.subtotal}
          serviceFeeAmount={order.serviceFeeAmount}
          totalAmount={order.totalAmount}
        />
      </div>

      <div className="mt-4 space-y-2">
        {!vm.finished ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={vm.isLoading}
            onClick={() => {
              void vm.refresh();
            }}
          >
            {tDefault('guest.order.refresh', 'Refresh status')}
          </Button>
        ) : null}
        {vm.finished || vm.isHistoryOrder ? (
          <Button className="w-full" onClick={vm.goHome}>
            {vm.isHistoryOrder
              ? tDefault('guest.order.backToHistory', 'Back to recent orders')
              : tDefault('guest.order.startAnother', 'Start another order')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
