import { useAppTranslation } from '@/app/i18n';
import { formatPrice } from '@/shared/utils/money';

type OrderTotalsProps = {
  subtotal: number;
  serviceFeeAmount: number;
  serviceFeeRate?: number;
  totalAmount: number;
};

/** Reusable subtotal / service fee / total block for cart and order views. */
export function OrderTotals({
  subtotal,
  serviceFeeAmount,
  serviceFeeRate,
  totalAmount,
}: OrderTotalsProps) {
  const { tDefault } = useAppTranslation();

  const serviceFeeLabel =
    serviceFeeRate != null && serviceFeeRate > 0
      ? `${tDefault('guest.totals.serviceFee', 'Service fee')} (${Math.round(serviceFeeRate * 100)}%)`
      : tDefault('guest.totals.serviceFee', 'Service fee');

  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-storefront-text-muted">
          {tDefault('guest.totals.subtotal', 'Subtotal')}
        </dt>
        <dd className="text-storefront-text-muted">{formatPrice(subtotal)}</dd>
      </div>
      {serviceFeeAmount > 0 ? (
        <div className="flex justify-between">
          <dt className="text-storefront-text-muted">{serviceFeeLabel}</dt>
          <dd className="text-storefront-text-muted">{formatPrice(serviceFeeAmount)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between border-t border-storefront-border pt-3 font-semibold text-storefront-text">
        <dt>{tDefault('guest.totals.total', 'Total')}</dt>
        <dd>{formatPrice(totalAmount)}</dd>
      </div>
    </dl>
  );
}
