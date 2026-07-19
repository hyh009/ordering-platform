import { X } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { anonymousAvatarImages } from '@/features/storeFront/components/ParticipantIdentitySelector/avatarImages';
import { OrderTotals } from '@/features/storeFront/components/OrderTotals';
import { useLocalizedText } from '@/features/storeFront/components/useLocalizedText';
import { getOrderingParticipantDisplayName } from '@/models/cart';
import { getParticipantAmount } from '@/models/order';
import type { Order } from '@/models/order';
import { formatPrice } from '@/shared/utils/money';

type ParticipantAmountDetailProps = {
  order: Order;
  participantId: string;
  onClose: () => void;
};

/**
 * Resolve which participant an item's value is attributed to, using the same
 * three-tier rule as the backend `toParticipantAmountDtos` attribution. This
 * MUST stay in sync with that backend logic so per-participant item lists
 * reconcile to the server-computed `itemSubtotal`.
 */
function resolveItemOwnerId(
  addedByParticipantId: string | undefined,
  submittedByParticipantId: string | undefined,
  participantIds: Set<string>,
  fallbackParticipantId: string | undefined,
): string | undefined {
  const resolved = addedByParticipantId ?? submittedByParticipantId;
  if (resolved !== undefined && participantIds.has(resolved)) return resolved;
  if (
    submittedByParticipantId !== undefined &&
    participantIds.has(submittedByParticipantId)
  ) {
    return submittedByParticipantId;
  }
  return fallbackParticipantId;
}

/**
 * Derived view data: this participant's items grouped by round. Rounds where the
 * participant has no items are skipped. Item ownership is resolved with the same
 * three-tier rule as the backend `toParticipantAmountDtos` attribution.
 */
function groupParticipantItemsByRound(order: Order, participantId: string) {
  const participantIds = new Set(order.participants.map((p) => p.id));
  const fallbackParticipantId = order.participants[0]?.id;

  return order.batches
    .map((batch) => ({
      batchNumber: batch.batchNumber,
      items: batch.items.filter(
        (item) =>
          resolveItemOwnerId(
            item.addedByParticipantId,
            batch.submittedByParticipantId,
            participantIds,
            fallbackParticipantId,
          ) === participantId,
      ),
    }))
    .filter((round) => round.items.length > 0);
}

export function ParticipantAmountDetail({
  order,
  participantId,
  onClose,
}: ParticipantAmountDetailProps) {
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();

  const participant = order.participants.find((p) => p.id === participantId);
  if (!participant) {
    return null;
  }

  const amount = getParticipantAmount(order, participantId);
  const name = getOrderingParticipantDisplayName(participant, tDefault);
  const rounds = groupParticipantItemsByRound(order, participantId);

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-page-modal bg-foreground/35"
        onClick={onClose}
      />

      <div
        aria-label={tDefault('guest.order.amountDetailTitle', 'Amount detail')}
        aria-modal="true"
        role="dialog"
        className="fixed inset-x-0 bottom-0 z-page-modal max-h-[85vh] overflow-y-auto rounded-t-2xl bg-storefront-bg lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[80vh] lg:w-full lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-storefront-border px-4 py-3">
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-storefront-border">
            <img
              alt={name}
              className="h-full w-full object-cover"
              src={anonymousAvatarImages[participant.avatarKey]}
            />
          </span>
          <span className="flex-1 truncate text-base font-semibold text-storefront-text">
            {name}
          </span>
          <button
            aria-label={tDefault('common.close', 'Close')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-storefront-text hover:bg-storefront-border/60"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {rounds.map((round) => (
            <section key={round.batchNumber}>
              <p className="text-sm font-semibold text-storefront-text">
                {tDefault('guest.order.batch', 'Round')} {round.batchNumber}
              </p>
              <ul className="mt-2 space-y-2 text-sm">
                {round.items.map((item) => (
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
            </section>
          ))}

          <div className="border-t border-storefront-border pt-4">
            <OrderTotals
              subtotal={amount?.itemSubtotal ?? 0}
              serviceFeeAmount={amount?.serviceFeeAmount ?? 0}
              totalAmount={amount?.totalAmount ?? 0}
            />
          </div>

          <p className="text-xs text-storefront-text-muted">
            {tDefault(
              'guest.order.serviceFeeSplit',
              'Service fee is split in proportion to what each person ordered; any remainder is assigned by the system.',
            )}
          </p>
        </div>
      </div>
    </>
  );
}
