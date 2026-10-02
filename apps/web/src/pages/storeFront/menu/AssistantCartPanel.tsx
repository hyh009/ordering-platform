import { useAppTranslation } from '@/app/i18n';
import { OrderTotals } from '@/features/storeFront/components/OrderTotals';
import { ParticipantOrderSection } from '@/features/storeFront/components/ParticipantOrderSection';
import { Button } from '@/shared/components/ui/button';
import { formatPrice } from '@/shared/utils/money';

import type { CartItem, CartParticipantGroup } from '@/models/cart';

type AssistantCartPanelProps = {
  groups: CartParticipantGroup[];
  totals: {
    subtotal: number;
    serviceFeeAmount: number;
    serviceFeeRate: number;
    totalAmount: number;
  } | null;
  isEmpty: boolean;
  isMutating: boolean;
  /** True while an accepted proposal is still being applied to the cart. */
  isApplying: boolean;
  onChangeQuantity: (item: CartItem, quantity: number) => void;
  onRemove: (item: CartItem) => void;
  onSubmit: () => void;
};

/**
 * The guest's real cart, rendered beside the conversation.
 *
 * It reuses the cart page's own sections and totals rather than restating the
 * cart, so the numbers here are the ones the cart reports — the assistant's
 * per-row summaries are the model's words, and a guest deciding whether to trust
 * a proposal needs the authoritative version.
 *
 * Edit handlers are passed only for the guest's own section. That is how
 * `ParticipantOrderSection` already expresses read-only, and it keeps the
 * shared-cart limits identical to every other storefront surface.
 */
export function AssistantCartPanel({
  groups,
  totals,
  isEmpty,
  isMutating,
  isApplying,
  onChangeQuantity,
  onRemove,
  onSubmit,
}: AssistantCartPanelProps) {
  const { tDefault } = useAppTranslation();

  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          {tDefault(
            'guest.assistant.cartEmpty',
            'Nothing in your cart yet. Anything you accept will show up here.',
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="divide-y divide-storefront-border px-4">
        {groups.map((group) => (
          <ParticipantOrderSection
            key={group.participant.id}
            participant={group.participant}
            items={group.items}
            isCurrentUser={group.isCurrentUser}
            isMutating={isMutating}
            {...(group.isCurrentUser ? { onChangeQuantity, onRemove } : {})}
          />
        ))}
      </div>

      {totals ? (
        <div className="mx-4 mt-4 border-t border-storefront-border pt-4">
          <OrderTotals
            subtotal={totals.subtotal}
            serviceFeeAmount={totals.serviceFeeAmount}
            serviceFeeRate={totals.serviceFeeRate}
            totalAmount={totals.totalAmount}
          />
        </div>
      ) : null}

      {/* Disabled while an apply is still running: submitting a cart that is
          mid-change would send an order the guest has not finished building. */}
      <div className="mt-auto p-4">
        <Button
          variant="storefront"
          className="w-full"
          disabled={isMutating || isApplying}
          onClick={onSubmit}
        >
          {tDefault('guest.cart.submit', 'Submit order')}
          {totals ? ` · ${formatPrice(totals.totalAmount)}` : ''}
        </Button>
      </div>
    </div>
  );
}
