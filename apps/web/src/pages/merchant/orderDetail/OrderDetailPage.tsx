import { useAppTranslation } from '@/app/i18n';
import { useActiveStoreLocale } from '@/app/global/activeStore/useActiveStoreLocale';
import { getOrderingParticipantDisplayName } from '@/models/cart';
import {
  getOrderBatchStatusLabel,
  getOrderPaymentStatusLabel,
  getOrderStatusLabel,
} from '@/models/order';
import { getLocalizedText } from '@/models/metadata';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { formatPrice } from '@/shared/utils/money';
import { useOrderDetailPageVM } from './useOrderDetailPageVM';

export function OrderDetailPage() {
  const { tDefault } = useAppTranslation();
  const locale = useActiveStoreLocale();
  const vm = useOrderDetailPageVM();

  if (vm.isLoading && !vm.order) {
    return (
      <LoadingState
        label={tDefault('merchant.orders.loadingDetail', 'Loading order')}
      />
    );
  }

  if (!vm.order) {
    return (
      <section className="admin-page-content">
        <ErrorState
          message={
            vm.error ?? tDefault('merchant.orders.notFound', 'Order not found.')
          }
          onRetry={vm.error ? vm.retry : undefined}
        />
      </section>
    );
  }

  const { order } = vm;

  const participantById = new Map(order.participants.map((p) => [p.id, p]));

  return (
    <section className="admin-page-content">
      {/* Back button */}
      <div className="mb-4">
        <Button
          onClick={vm.goBack}
          size="sm"
          type="button"
          variant="ghost"
          className="-ml-2"
        >
          ← {tDefault('common.actions.back', 'Back')}
        </Button>
      </div>

      {/* Order header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {tDefault('merchant.orders.number', 'Order #')}
          </p>
          <h1 className="mt-1 text-3xl leading-tight font-bold md:text-4xl">
            #{order.displayNumber}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
              {getOrderStatusLabel(order.status, tDefault)}
            </span>
            <span>
              {getOrderPaymentStatusLabel(order.paymentStatus, tDefault)}
            </span>
            {order.tableNumber ? (
              <span>
                {tDefault('merchant.orders.table', 'Table')} {order.tableNumber}
              </span>
            ) : null}
            <span>
              {order.orderType === 'dine_in'
                ? tDefault('merchant.orders.dineIn', 'Dine in')
                : tDefault('merchant.orders.takeaway', 'Takeaway')}
            </span>
            <span>{order.businessDate}</span>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-sm text-muted-foreground">
            {tDefault('merchant.orders.total', 'Total')}
          </p>
          <p className="mt-1 text-3xl font-bold">
            {formatPrice(order.totalAmount)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tDefault('merchant.orders.participants', 'Participants')}:{' '}
            {order.participants.length}
          </p>
        </div>
      </div>

      {/* Participants */}
      {order.participants.length > 0 ? (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">
            {tDefault('merchant.orders.participantsSection', 'Participants')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {order.participants.map((participant) => (
              <span
                key={participant.id}
                className="rounded-full bg-muted px-3 py-1 text-sm"
              >
                {getOrderingParticipantDisplayName(participant, tDefault)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Batches */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">
          {tDefault('merchant.orders.rounds', 'Rounds')}
        </h2>
        {order.batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tDefault('merchant.orders.noBatches', 'No rounds yet.')}
          </p>
        ) : (
          order.batches.map((batch) => {
            const submitter = batch.submittedByParticipantId
              ? participantById.get(batch.submittedByParticipantId)
              : undefined;

            return (
              <div key={batch.id} className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {tDefault('merchant.orders.round', 'Round')}{' '}
                      {batch.batchNumber}
                    </p>
                    {submitter ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tDefault(
                          'merchant.orders.submittedBy',
                          'Submitted by',
                        )}{' '}
                        {getOrderingParticipantDisplayName(
                          submitter,
                          tDefault,
                        )}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {getOrderBatchStatusLabel(batch.status, tDefault)}
                  </span>
                </div>

                <ul className="space-y-2 text-sm">
                  {batch.items.map((item) => {
                    const name = getLocalizedText(
                      item.productName,
                      locale.defaultLocale,
                    );
                    return (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span>
                          {name} × {item.quantity}
                        </span>
                        <span className="font-medium">
                          {formatPrice(item.totalItemPrice)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3 flex justify-between border-t pt-2.5 text-sm">
                  <span className="text-muted-foreground">
                    {tDefault(
                      'merchant.orders.roundSubtotal',
                      'Round subtotal',
                    )}
                  </span>
                  <span className="font-medium">
                    {formatPrice(batch.subtotal)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Totals */}
      <div className="mt-6 rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">
          {tDefault('merchant.orders.totals', 'Totals')}
        </h2>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {tDefault('merchant.orders.subtotal', 'Subtotal')}
            </span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {tDefault('merchant.orders.serviceFee', 'Service fee')} (
              {(order.serviceFeeRate * 100).toFixed(0)}%)
            </span>
            <span>{formatPrice(order.serviceFeeAmount)}</span>
          </div>
          <div className="flex justify-between border-t pt-1.5 font-semibold">
            <span>{tDefault('merchant.orders.total', 'Total')}</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
