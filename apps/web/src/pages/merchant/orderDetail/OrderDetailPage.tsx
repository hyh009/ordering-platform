import { useAppTranslation } from '@/app/i18n';
import { useActiveStoreLocale } from '@/app/global/activeStore/useActiveStoreLocale';
import { getOrderingParticipantDisplayName } from '@/models/cart';
import {
  getNextBatchStatus,
  getOrderBatchStatusLabel,
  getOrderCancelReasonLabel,
  getOrderPaymentStatusLabel,
  getOrderStatusLabel,
} from '@/models/order';
import { getLocalizedText } from '@/models/metadata';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { useRelativeTime } from '@/shared/hooks/useRelativeTime';
import { formatPrice } from '@/shared/utils/money';
import { useOrderDetailPageVM } from './useOrderDetailPageVM';

export function OrderDetailPage() {
  const { tDefault } = useAppTranslation();
  const locale = useActiveStoreLocale();
  const vm = useOrderDetailPageVM();
  const relativeTime = useRelativeTime(vm.lastLoadedAt);

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
  const cancelledAmount = order.batches
    .filter((b) => b.status === 'cancelled')
    .reduce((sum, b) => sum + b.subtotal, 0);

  return (
    <section className="admin-page-content">
      {/* Back row with freshness indicator */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={vm.goBack}
          size="sm"
          type="button"
          variant="ghost"
          className="-ml-2"
        >
          ← {tDefault('common.actions.back', 'Back')}
        </Button>

        {vm.lastLoadedAt !== null ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {tDefault('merchant.orders.updatedAgo', 'Updated')} {relativeTime}
            </span>
            <Button
              disabled={vm.isLoading}
              onClick={vm.retry}
              size="sm"
              type="button"
              variant="ghost"
              className="h-auto px-2 py-1 text-xs"
            >
              {tDefault('merchant.orders.refresh', 'Refresh')}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Order header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

          {/* Cancelled order reason + note */}
          {order.status === 'cancelled' &&
          (order.cancelReasons?.length || order.cancelNote) ? (
            <div className="mt-2 text-sm text-destructive space-y-0.5">
              {order.cancelReasons && order.cancelReasons.length > 0 ? (
                <p>
                  {tDefault('merchant.orders.cancelReasons', 'Reasons')}:{' '}
                  {order.cancelReasons
                    .map((r) => getOrderCancelReasonLabel(r, tDefault))
                    .join(', ')}
                </p>
              ) : null}
              {order.cancelNote ? (
                <p>
                  {tDefault('merchant.orders.cancelNote', 'Note')}:{' '}
                  {order.cancelNote}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
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

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {vm.canCheckout ? (
              <Button
                disabled={vm.mutating}
                onClick={vm.checkout}
                size="sm"
                type="button"
                variant="default"
              >
                {tDefault('merchant.orders.actions.markPaid', 'Mark paid')}
              </Button>
            ) : null}

            {vm.canCancel ? (
              <Button
                disabled={vm.mutating}
                onClick={vm.openOrderCancel}
                size="sm"
                type="button"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
              >
                {tDefault('merchant.orders.actions.cancel', 'Cancel order')}
              </Button>
            ) : null}

            {/* Complete button — only for pay_first orders; pay_later auto-completes on checkout */}
            {order.checkoutMode === 'pay_first' &&
            order.status !== 'completed' &&
            order.status !== 'cancelled' ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        disabled={vm.mutating || !vm.canComplete}
                        onClick={vm.complete}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {tDefault(
                          'merchant.orders.actions.complete',
                          'Complete',
                        )}
                      </Button>
                    }
                  />
                  {!vm.canComplete ? (
                    <TooltipContent>
                      {tDefault(
                        'merchant.orders.complete.tooltip',
                        'All rounds must be ready before completing',
                      )}
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        </div>
      </div>

      {/* Cancel reason modal (shared for order + batch) */}
      <Dialog
        open={vm.isCancelOpen}
        onOpenChange={(open) => {
          if (!open) vm.closeCancelModal();
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {vm.cancelTarget?.kind === 'batch'
                ? tDefault(
                    'merchant.orders.cancelBatchModal.title',
                    'Cancel this round',
                  )
                : tDefault('merchant.orders.cancelModal.title', 'Cancel order')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {tDefault(
                'merchant.orders.cancelModal.description',
                'Select a reason (or add a note) for cancelling.',
              )}
            </p>

            {/* Checkbox group */}
            <div className="space-y-2">
              {vm.orderCancelReasons.map((reason) => (
                <label
                  key={reason}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={vm.selectedReasons.includes(reason)}
                    onChange={() => vm.toggleReason(reason)}
                  />
                  {getOrderCancelReasonLabel(reason, tDefault)}
                </label>
              ))}
            </div>

            {/* Free-text note */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {tDefault('merchant.orders.cancelModal.noteLabel', 'Note (optional)')}
              </p>
              <Textarea
                value={vm.cancelNote}
                onChange={(e) => vm.setCancelNote(e.target.value)}
                placeholder={tDefault(
                  'merchant.orders.cancelModal.notePlaceholder',
                  'Add a note…',
                )}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={vm.mutating}
              onClick={vm.closeCancelModal}
              type="button"
              variant="outline"
            >
              {tDefault('common.actions.cancel', 'Cancel')}
            </Button>
            <Button
              disabled={vm.mutating || !vm.canSubmitCancel}
              onClick={vm.confirmCancel}
              type="button"
              variant="destructive"
            >
              {vm.cancelTarget?.kind === 'batch'
                ? tDefault(
                    'merchant.orders.cancelBatchModal.confirm',
                    'Cancel round',
                  )
                : tDefault('merchant.orders.cancelModal.confirm', 'Cancel order')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Participants */}
      {order.participants.length > 0 ? (
        <div className="rounded-lg border bg-card p-4">
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

      {/* Rounds */}
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

            const isCancelled = batch.status === 'cancelled';
            const isReady = batch.status === 'ready';
            const nextBatch = getNextBatchStatus(batch.status, tDefault);
            const isTerminal = isReady || isCancelled;

            return (
              <div
                key={batch.id}
                className={
                  isReady
                    ? 'rounded-lg border bg-card p-4 opacity-60'
                    : isCancelled
                      ? 'rounded-lg border bg-card p-4 opacity-40 grayscale'
                      : 'rounded-lg border bg-card p-4'
                }
              >
                {/* Batch header */}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {isReady ? '✓ ' : ''}
                      {tDefault('merchant.orders.round', 'Round')}{' '}
                      {batch.batchNumber}
                    </p>
                    {submitter ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tDefault(
                          'merchant.orders.submittedBy',
                          'Submitted by',
                        )}{' '}
                        {getOrderingParticipantDisplayName(submitter, tDefault)}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={
                      isCancelled || isReady
                        ? 'text-sm text-muted-foreground'
                        : 'text-sm font-medium'
                    }
                  >
                    {getOrderBatchStatusLabel(batch.status, tDefault)}
                  </span>
                </div>

                {/* Items */}
                <ul className="space-y-2 text-sm">
                  {batch.items.map((item) => {
                    const name = getLocalizedText(
                      item.productName,
                      locale.defaultLocale,
                    );
                    return (
                      <li
                        key={item.id}
                        className={
                          isCancelled
                            ? 'flex justify-between gap-3 line-through text-muted-foreground'
                            : 'flex justify-between gap-3'
                        }
                      >
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

                {/* Batch cancel reason + note */}
                {isCancelled &&
                (batch.cancelReasons?.length || batch.cancelNote) ? (
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                    {batch.cancelReasons && batch.cancelReasons.length > 0 ? (
                      <p>
                        {tDefault('merchant.orders.cancelReasons', 'Reasons')}:{' '}
                        {batch.cancelReasons
                          .map((r) => getOrderCancelReasonLabel(r, tDefault))
                          .join(', ')}
                      </p>
                    ) : null}
                    {batch.cancelNote ? (
                      <p>
                        {tDefault('merchant.orders.cancelNote', 'Note')}:{' '}
                        {batch.cancelNote}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* Batch action buttons */}
                {!isTerminal ? (
                  <div className="mt-3 flex gap-2 border-t pt-3">
                    {nextBatch ? (
                      <Button
                        disabled={vm.mutating}
                        onClick={() => vm.advanceBatch(batch.id)}
                        size="sm"
                        type="button"
                        variant="default"
                      >
                        {nextBatch.label}
                      </Button>
                    ) : null}
                    <Button
                      disabled={vm.mutating}
                      onClick={() => vm.openBatchCancel(batch.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      {tDefault(
                        'merchant.orders.actions.cancelBatch',
                        'Cancel this round',
                      )}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* Totals */}
      <div className="rounded-lg border bg-card p-4">
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
          {cancelledAmount > 0 ? (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {tDefault('merchant.orders.cancelledAmount', 'Cancelled')}
              </span>
              <span className="line-through">
                {formatPrice(cancelledAmount)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
