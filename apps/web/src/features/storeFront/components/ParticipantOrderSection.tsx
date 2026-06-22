import { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingBag, Trash2 } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import {
  getOrderingParticipantDisplayName,
  type CartItem,
  type OrderingParticipant,
} from '@/models/cart';
import { Button } from '@/shared/components/ui/button';
import { formatPrice } from '@/shared/utils/money';
import { anonymousAvatarImages } from './ParticipantIdentitySelector/avatarImages';
import { useLocalizedText } from './useLocalizedText';

export interface ParticipantOrderSectionProps {
  participant: OrderingParticipant;
  items: CartItem[];
  /** Whether the current session user owns this section (enables edit controls). */
  isCurrentUser: boolean;
  isMutating?: boolean;
  onChangeQuantity?: (item: CartItem, qty: number) => void;
  onRemove?: (item: CartItem) => void;
}

export function ParticipantOrderSection({
  participant,
  items,
  isCurrentUser,
  isMutating = false,
  onChangeQuantity,
  onRemove,
}: ParticipantOrderSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();

  const avatarSrc = anonymousAvatarImages[participant.avatarKey];
  const name = getOrderingParticipantDisplayName(participant, tDefault);

  return (
    <section>
      <button
        type="button"
        className="flex w-full items-center gap-3 py-3"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
          <img
            alt={name}
            className="h-full w-full object-cover"
            src={avatarSrc}
          />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-storefront-text">{name}</p>
            {isCurrentUser ? (
              <span className="rounded-full bg-storefront-primary/20 px-1.5 py-0.5 text-xs font-medium text-storefront-primary">
                我
              </span>
            ) : null}
          </div>
          <p className="text-xs text-storefront-text-muted">
            {items.length > 0
              ? `${items.length} ${tDefault('guest.cart.itemCount', '項商品')}`
              : tDefault('guest.cart.noOrders', '尚未點餐')}
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-storefront-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-storefront-text-muted" />
        )}
      </button>

      {isExpanded ? (
        <div className="space-y-3 pb-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-storefront-border py-8 text-center">
              <ShoppingBag className="h-10 w-10 text-storefront-text-muted opacity-30" />
              <p className="text-sm text-storefront-text-muted">
                {tDefault(
                  'guest.cart.emptyParticipant',
                  '還沒點餐呢！快去選擇你的餐點',
                )}
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-storefront-border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-storefront-text">
                    {localize(item.productName)}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-storefront-text">
                      {formatPrice(item.totalItemPrice)}
                    </span>
                    {isCurrentUser && onRemove ? (
                      <button
                        type="button"
                        disabled={isMutating}
                        className="text-red-400 hover:text-red-600 disabled:opacity-40"
                        onClick={() => onRemove(item)}
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>
                </div>

                {item.selectedOptions.length > 0 ? (
                  <p className="mt-0.5 text-xs text-storefront-text-muted">
                    {item.selectedOptions
                      .map((o) => localize(o.optionName))
                      .join(', ')}
                  </p>
                ) : null}
                {item.notes ? (
                  <p className="mt-0.5 text-xs text-storefront-text-muted">
                    {item.notes}
                  </p>
                ) : null}

                {isCurrentUser && onChangeQuantity ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      disabled={isMutating || item.quantity <= 1}
                      onClick={() => onChangeQuantity(item, item.quantity - 1)}
                    >
                      −
                    </Button>
                    <span className="w-5 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      disabled={isMutating || item.quantity >= 99}
                      onClick={() => onChangeQuantity(item, item.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-storefront-text-muted">
                    × {item.quantity}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
