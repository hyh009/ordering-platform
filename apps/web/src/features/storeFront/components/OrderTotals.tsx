import { useAppTranslation } from '@/app/i18n';
import { formatPrice } from '@/shared/utils/money';

type OrderTotalsProps = {
  subtotal: number;
  serviceFeeAmount: number;
  totalAmount: number;
};

/** Reusable subtotal / service fee / total block for cart and order views. */
export function OrderTotals({
  subtotal,
  serviceFeeAmount,
  totalAmount,
}: OrderTotalsProps) {
  const { tDefault } = useAppTranslation();

  return (
    <dl className="space-y-1 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">
          {tDefault('guest.totals.subtotal', 'Subtotal')}
        </dt>
        <dd>{formatPrice(subtotal)}</dd>
      </div>
      {serviceFeeAmount > 0 ? (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            {tDefault('guest.totals.serviceFee', 'Service fee')}
          </dt>
          <dd>{formatPrice(serviceFeeAmount)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between border-t border-border pt-1 text-base font-semibold">
        <dt>{tDefault('guest.totals.total', 'Total')}</dt>
        <dd>{formatPrice(totalAmount)}</dd>
      </div>
    </dl>
  );
}
