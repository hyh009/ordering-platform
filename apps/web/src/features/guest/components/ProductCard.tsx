import { useAppTranslation } from '@/app/i18n';
import type { PublicProduct } from '@/models/guestMenu';
import { formatPrice } from '@/shared/utils/money';
import { useLocalizedText } from './useLocalizedText';

type ProductCardProps = {
  product: PublicProduct;
  onSelect: (product: PublicProduct) => void;
  disabled?: boolean;
};

export function ProductCard({ product, onSelect, disabled }: ProductCardProps) {
  const localize = useLocalizedText();
  const { tDefault } = useAppTranslation();

  const soldOut = product.isSoldOut;
  const isDisabled = disabled || soldOut;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onSelect(product)}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition active:scale-[0.99] disabled:opacity-60"
    >
      {product.imageUrls[0] ? (
        <img
          src={product.imageUrls[0]}
          alt={localize(product.name)}
          className="size-16 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="size-16 shrink-0 rounded-md bg-muted" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{localize(product.name)}</p>
        {product.description ? (
          <p className="truncate text-sm text-muted-foreground">
            {localize(product.description)}
          </p>
        ) : null}
        <p className="mt-1 text-sm font-semibold">
          {formatPrice(product.price)}
        </p>
      </div>

      {soldOut ? (
        <span className="shrink-0 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
          {tDefault('guest.menu.soldOut', 'Sold out')}
        </span>
      ) : null}
    </button>
  );
}
