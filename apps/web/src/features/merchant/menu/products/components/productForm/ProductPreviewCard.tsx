import { useAppTranslation } from '@/app/i18n';
import { getLocalizedText } from '@/models/metadata';
import type { StoreLocaleDto } from '@/models/store';
import type { ProductFormValues } from './useProductForm';

type Props = {
  values: ProductFormValues;
  locale: StoreLocaleDto;
};

export function ProductPreviewCard({ values, locale }: Props) {
  const { tDefault } = useAppTranslation();

  const name = getLocalizedText(values.name, locale.defaultLocale);
  const description = getLocalizedText(values.description, locale.defaultLocale);
  const imageUrl = values.imageUrl.trim();

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold">
        {tDefault('merchant.products.preview', 'Preview')}
      </h2>

      <div className="overflow-hidden rounded-md border border-border">
        {imageUrl ? (
          <img
            alt={name}
            className="aspect-video w-full object-cover"
            src={imageUrl}
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted text-xs text-muted-foreground">
            {tDefault('merchant.products.noImage', 'No image')}
          </div>
        )}

        <div className="grid gap-1 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-medium">
              {name ||
                tDefault('merchant.products.untitled', 'Untitled product')}
            </span>
            <span className="shrink-0 text-sm font-semibold">
              {values.price.toFixed(2)}
            </span>
          </div>
          {description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
