import type { ReactNode } from 'react';
import { useAppTranslation } from '@/app/i18n';
import type { Product } from '@/models/product';
import type { StoreLocaleDto } from '@/models/store';
import { LocalizedStringView } from '@/shared/components/LocalizedStringView';
import { ReadOnlyField } from '@/shared/components/form/ReadOnlyField';
import { Badge } from '@/shared/components/ui/badge';
import type { MultiSelectOption } from '@/shared/components/form/MultiSelect';
import { ProductStatusBadge } from './ProductStatusBadge';
import type { ProductFormOptions } from './productForm/useProductFormOptions';

type Props = {
  product: Product;
  formOptions: ProductFormOptions;
  locale: StoreLocaleDto;
};

function labelsFor(ids: string[], options: MultiSelectOption[]): string[] {
  const byValue = new Map(options.map((option) => [option.value, option.label]));
  return ids.map((id) => byValue.get(id) ?? id);
}

function ChipList({
  ids,
  options,
  emptyLabel,
}: {
  ids: string[];
  options: MultiSelectOption[];
  emptyLabel: ReactNode;
}) {
  if (ids.length === 0) {
    return <span className="text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <span className="flex flex-wrap gap-1">
      {labelsFor(ids, options).map((label, index) => (
        <Badge key={`${label}-${index}`} variant="secondary">
          {label}
        </Badge>
      ))}
    </span>
  );
}

export function ProductDetailsView({ product, formOptions, locale }: Props) {
  const { tDefault } = useAppTranslation();
  const none = tDefault('common.none', 'None');
  const imageUrl = product.imageUrls[0];

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 rounded-lg border border-border p-4">
        {imageUrl ? (
          <img
            alt=""
            className="h-auto w-full max-w-xs rounded-md border border-border"
            src={imageUrl}
          />
        ) : null}

        <ReadOnlyField label={tDefault('merchant.products.name', 'Name')}>
          <LocalizedStringView
            highlightLocale={locale.defaultLocale}
            value={product.name}
          />
        </ReadOnlyField>

        <ReadOnlyField
          label={tDefault('merchant.products.description', 'Description')}
        >
          {product.description ? (
            <LocalizedStringView
              highlightLocale={locale.defaultLocale}
              value={product.description}
            />
          ) : (
            <span className="text-muted-foreground">{none}</span>
          )}
        </ReadOnlyField>

        <ReadOnlyField label={tDefault('merchant.products.price', 'Price')}>
          {product.price.toFixed(2)}
        </ReadOnlyField>
      </div>

      <div className="grid gap-5 rounded-lg border border-border p-4">
        <ReadOnlyField
          label={tDefault('merchant.products.categories', 'Categories')}
        >
          <ChipList
            emptyLabel={none}
            ids={product.categoryIds}
            options={formOptions.categories}
          />
        </ReadOnlyField>

        <ReadOnlyField label={tDefault('merchant.products.tags', 'Tags')}>
          <ChipList
            emptyLabel={none}
            ids={product.tagIds}
            options={formOptions.tags}
          />
        </ReadOnlyField>

        <ReadOnlyField
          label={tDefault('merchant.products.allergens', 'Allergens')}
        >
          <ChipList
            emptyLabel={none}
            ids={product.allergenIds}
            options={formOptions.allergens}
          />
        </ReadOnlyField>

        <ReadOnlyField
          label={tDefault('merchant.products.dietaryMarkers', 'Dietary markers')}
        >
          <ChipList
            emptyLabel={none}
            ids={product.dietaryMarkerIds}
            options={formOptions.dietaryMarkers}
          />
        </ReadOnlyField>

        <ReadOnlyField
          label={tDefault('merchant.products.modifiers', 'Modifiers')}
        >
          <ChipList
            emptyLabel={none}
            ids={product.modifierIds}
            options={formOptions.modifiers}
          />
        </ReadOnlyField>
      </div>

      <div className="grid gap-5 rounded-lg border border-border p-4">
        <ReadOnlyField label={tDefault('merchant.products.statusLabel', 'Status')}>
          <ProductStatusBadge status={product.status} />
        </ReadOnlyField>

        <ReadOnlyField
          label={tDefault('merchant.products.visibility', 'Visibility')}
        >
          {product.isActive
            ? tDefault('merchant.products.visible', 'Visible')
            : tDefault('merchant.products.hidden', 'Hidden')}
        </ReadOnlyField>

        <ReadOnlyField
          label={tDefault('merchant.products.soldOut', 'Sold out')}
        >
          {product.isSoldOut
            ? tDefault('common.yes', 'Yes')
            : tDefault('common.no', 'No')}
        </ReadOnlyField>
      </div>
    </div>
  );
}
