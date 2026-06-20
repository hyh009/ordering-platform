import { Plus } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import type { PublicProduct } from '@/models/storeFrontMenu';
import { formatPrice } from '@/shared/utils/money';
import { AllergenDisplay } from './AllergenDisplay';
import { useLocalizedText } from './useLocalizedText';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type TagDisplay = {
  id: string;
  label: string;
  color?: string;
};

type ProductCardProps = {
  product: PublicProduct;
  tags: TagDisplay[];
  allergens: string[];
  onSelect: (product: PublicProduct) => void;
  disabled?: boolean;
};

export function ProductCard({
  product,
  tags = [],
  allergens = [],
  onSelect,
  disabled,
}: ProductCardProps) {
  const localize = useLocalizedText();
  const { tDefault } = useAppTranslation();

  const soldOut = product.isSoldOut;
  const isDisabled = disabled || soldOut;
  const imageSrc = product.imageUrls[0];

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      onClick={() => {
        if (!isDisabled) onSelect(product);
      }}
      onKeyDown={(e) => {
        if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
          onSelect(product);
        }
      }}
      className="flex w-full cursor-pointer select-none flex-row items-start gap-3 rounded-xl border border-storefront-border bg-white p-3 text-left shadow-sm transition-colors hover:border-storefront-primary/50 aria-disabled:cursor-default aria-disabled:opacity-60"
    >
      {/* Image — hidden when no imageUrl */}
      {imageSrc ? (
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-storefront-border lg:size-24">
          <img
            src={imageSrc}
            alt={localize(product.name)}
            className="h-full w-full object-cover"
          />
          {soldOut ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="text-center text-xs font-semibold text-white">
                {tDefault('guest.menu.soldOut', 'Sold out')}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug text-storefront-text">
              {localize(product.name)}
            </p>
            <p className="mt-0.5 font-semibold text-storefront-text">
              {formatPrice(product.price)}
            </p>
          </div>

          {/* "+" button — hidden when sold out or disabled */}
          {!soldOut && !disabled ? (
            <span
              aria-hidden
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-storefront-primary text-white"
            >
              <Plus size={14} strokeWidth={2.5} />
            </span>
          ) : null}

          {/* Sold out badge for no-image cards */}
          {soldOut && !imageSrc ? (
            <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {tDefault('guest.menu.soldOut', 'Sold out')}
            </span>
          ) : null}
        </div>

        {/* Tags */}
        {tags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.map((tag) => {
              const color = tag.color ?? '#000000';
              return (
                <span
                  key={tag.id}
                  className="rounded px-2 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: hexToRgba(color, 0.1),
                    border: `1px solid ${color}`,
                    color,
                  }}
                >
                  {tag.label}
                </span>
              );
            })}
          </div>
        ) : null}

        <AllergenDisplay allergens={allergens} visibleCount={3} />
      </div>
    </div>
  );
}
