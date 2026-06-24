import { useAppTranslation } from '@/app/i18n';
import { anonymousAvatarImages } from '@/features/storeFront/components/ParticipantIdentitySelector/avatarImages';
import { OrderTotals } from '@/features/storeFront/components/OrderTotals';
import { StorefrontErrorView } from '@/features/storeFront/components/StorefrontErrorView';
import { StorefrontLoadingView } from '@/features/storeFront/components/StorefrontLoadingView';
import { StorefrontPageHeader } from '@/features/storeFront/components/StorefrontPageHeader';
import { useLocalizedText } from '@/features/storeFront/components/useLocalizedText';
import { getOrderingParticipantDisplayName } from '@/models/cart';
import {
  getOrderBatchStatusLabel,
  getOrderPaymentStatusLabel,
  getOrderStatusLabel,
  getParticipantAmount,
} from '@/models/order';
import { Button } from '@/shared/components/ui/button';
import { formatPrice } from '@/shared/utils/money';
import { ParticipantAmountDetail } from './ParticipantAmountDetail';
import { useOrderTrackingPageVM } from './useOrderTrackingPageVM';

export function OrderTrackingPage() {
  const vm = useOrderTrackingPageVM();
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();

  const storeName = vm.store ? localize(vm.store.displayName) : undefined;

  const header = (
    <StorefrontPageHeader
      sticky
      left={StorefrontPageHeader.Left.Back}
      middle={StorefrontPageHeader.Middle.Title}
      right={StorefrontPageHeader.Right.Logo}
      title={tDefault('guest.order.trackTitle', 'Order')}
      onBack={vm.goBack}
      logoUrl={vm.store?.logoUrl}
      logoAlt={storeName}
    />
  );

  if (!vm.order) {
    return (
      <div className="flex flex-1 flex-col bg-storefront-bg">
        {header}
        {vm.isLoading ? (
          <StorefrontLoadingView />
        ) : (
          <StorefrontErrorView
            message={
              vm.error ?? tDefault('guest.order.notFound', 'Order not found.')
            }
            onRetry={vm.error ? vm.retry : undefined}
          />
        )}
      </div>
    );
  }

  const { order } = vm;

  const participantById = new Map(
    order.participants.map((participant) => [participant.id, participant]),
  );

  const totalItemCount = order.batches.reduce(
    (sum, batch) =>
      sum + batch.items.reduce((acc, item) => acc + item.quantity, 0),
    0,
  );

  return (
    <div className="flex flex-1 flex-col bg-storefront-bg">
      {header}

      <div className="flex-1 px-4 pb-32">
        <div className="mx-auto w-full max-w-2xl">
          <header className="flex items-start justify-between gap-4 pt-6">
            <div>
              <p className="text-sm text-storefront-text-muted">
                {tDefault('guest.order.number', 'Order number')}
              </p>
              <p className="mt-0.5 text-4xl font-bold tracking-tight text-storefront-text">
                #{order.displayNumber}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-block rounded-full bg-storefront-secondary/15 px-3 py-1 text-sm font-medium text-storefront-text">
                  {getOrderStatusLabel(order.status, tDefault)}
                </span>
                <span className="text-sm text-storefront-text-muted">
                  {getOrderPaymentStatusLabel(order.paymentStatus, tDefault)}
                  {order.tableNumber
                    ? ` · ${tDefault('guest.order.table', 'Table')} ${order.tableNumber}`
                    : ''}
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm text-storefront-text-muted">
                {tDefault('guest.order.totalAmount', 'Total amount')}
              </p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight text-storefront-text">
                {formatPrice(order.totalAmount)}
              </p>
              <p className="mt-1 text-sm text-storefront-text-muted">
                {totalItemCount} {tDefault('guest.order.itemCount', 'items')}
              </p>
            </div>
          </header>

          {vm.myAmount ? (
            <button
              type="button"
              onClick={() =>
                vm.openParticipantDetail(vm.myAmount!.participantId)
              }
              className="mt-6 w-full rounded-2xl border border-storefront-border bg-storefront-secondary/10 p-4 text-left transition-colors hover:bg-storefront-secondary/15"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-storefront-text-muted">
                    {tDefault('guest.order.myAmount', 'My amount')}
                  </p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight text-storefront-text">
                    {formatPrice(vm.myAmount.totalAmount)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-storefront-primary">
                  {tDefault('guest.order.viewDetail', 'View detail')} ›
                </span>
              </div>
              <p className="mt-2 text-xs text-storefront-text-muted">
                {tDefault(
                  'guest.order.amountReference',
                  'Reference amount only — no payment is processed here.',
                )}
              </p>
            </button>
          ) : null}

          <section className="mt-6">
            <p className="text-sm font-semibold text-storefront-text">
              {tDefault('guest.order.participants', 'Participants')}
            </p>
            <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
              {order.participants.map((participant) => {
                const name = getOrderingParticipantDisplayName(
                  participant,
                  tDefault,
                );
                const amount = getParticipantAmount(
                  order,
                  participant.id,
                )?.totalAmount;
                const isCurrentUser = participant.id === vm.myParticipantId;

                return (
                  <button
                    key={participant.id}
                    type="button"
                    className="flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-storefront-border bg-storefront-bg p-3 text-center"
                    onClick={() => vm.openParticipantDetail(participant.id)}
                  >
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-storefront-border">
                      <img
                        alt={name}
                        className="h-full w-full object-cover"
                        src={anonymousAvatarImages[participant.avatarKey]}
                      />
                    </span>
                    <span className="flex max-w-full items-center gap-1">
                      <span className="truncate text-xs font-medium text-storefront-text">
                        {name}
                      </span>
                      {isCurrentUser ? (
                        <span className="shrink-0 rounded-full bg-storefront-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-storefront-primary">
                          {tDefault('guest.order.youBadge', 'You')}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-sm font-semibold text-storefront-text">
                      {formatPrice(amount ?? 0)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mt-6 space-y-3">
            {order.batches.map((batch) => {
              const submittedBy = batch.submittedByParticipantId
                ? participantById.get(batch.submittedByParticipantId)
                : undefined;
              const submittedByName = submittedBy
                ? getOrderingParticipantDisplayName(submittedBy, tDefault)
                : undefined;
              const batchSubtotal = batch.items.reduce(
                (sum, item) => sum + item.totalItemPrice,
                0,
              );

              return (
                <section
                  key={batch.id}
                  className="rounded-2xl border border-storefront-border bg-storefront-bg p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {submittedBy ? (
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-storefront-border">
                          <img
                            alt={submittedByName}
                            className="h-full w-full object-cover"
                            src={anonymousAvatarImages[submittedBy.avatarKey]}
                          />
                        </span>
                      ) : null}
                      <div>
                        <p className="text-sm font-semibold text-storefront-text">
                          {tDefault('guest.order.batch', 'Round')}{' '}
                          {batch.batchNumber}
                        </p>
                        {submittedByName ? (
                          <p className="mt-0.5 text-xs text-storefront-text-muted">
                            {tDefault(
                              'guest.order.batchSubmittedBy',
                              'Added by',
                            )}{' '}
                            {submittedByName}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm text-storefront-text-muted">
                      {getOrderBatchStatusLabel(batch.status, tDefault)}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm">
                    {batch.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between gap-3 text-storefront-text"
                      >
                        <span>
                          {localize(item.productName)} × {item.quantity}
                        </span>
                        <span>{formatPrice(item.totalItemPrice)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex justify-between border-t border-storefront-border pt-2.5 text-sm">
                    <span className="text-storefront-text-muted">
                      {tDefault('guest.totals.subtotal', 'Subtotal')}
                    </span>
                    <span className="font-medium text-storefront-text">
                      {formatPrice(batchSubtotal)}
                    </span>
                  </div>
                </section>
              );
            })}
          </div>

          <div className="mt-5 border-t border-storefront-border pt-4">
            <OrderTotals
              subtotal={order.subtotal}
              serviceFeeAmount={order.serviceFeeAmount}
              totalAmount={order.totalAmount}
            />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-sticky bg-gradient-to-t from-storefront-bg from-60% to-transparent px-4 pb-4 pt-14">
        <div className="mx-auto w-full max-w-2xl space-y-2">
          {vm.canAddOn ? (
            <Button
              variant="storefront"
              className="w-full"
              onClick={vm.addMore}
            >
              {tDefault('guest.order.addMore', 'Add more')}
            </Button>
          ) : null}
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
            <Button variant="storefront" className="w-full" onClick={vm.goHome}>
              {vm.isHistoryOrder
                ? tDefault('guest.order.backToHistory', 'Back to recent orders')
                : tDefault('guest.order.startAnother', 'Start another order')}
            </Button>
          ) : null}
        </div>
      </div>

      {vm.selectedParticipantId ? (
        <ParticipantAmountDetail
          order={order}
          participantId={vm.selectedParticipantId}
          onClose={vm.closeParticipantDetail}
        />
      ) : null}
    </div>
  );
}
