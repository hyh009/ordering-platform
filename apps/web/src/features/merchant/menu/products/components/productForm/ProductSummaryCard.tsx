import { useAppTranslation } from '@/app/i18n';
import type { ProductStatus } from '@/models/product';
import { ProductStatusBadge } from '../ProductStatusBadge';
import type { ProductFormValues } from './useProductForm';

type Props = {
  values: ProductFormValues;
  status: ProductStatus;
};

export function ProductSummaryCard({ values, status }: Props) {
  const { tDefault } = useAppTranslation();

  const rows: { label: string; value: string }[] = [
    {
      label: tDefault('merchant.products.summaryCategories', 'Categories'),
      value: String(values.categoryIds.length),
    },
    {
      label: tDefault('merchant.products.summaryTags', 'Tags'),
      value: String(values.tagIds.length),
    },
    {
      label: tDefault('merchant.products.summaryModifiers', 'Modifiers'),
      value: String(values.modifierIds.length),
    },
    {
      label: tDefault('merchant.products.summaryAllergens', 'Allergens'),
      value: String(values.allergenIds.length),
    },
    {
      label: tDefault(
        'merchant.products.summaryDietaryMarkers',
        'Dietary markers',
      ),
      value: String(values.dietaryMarkerIds.length),
    },
  ];

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold">
        {tDefault('merchant.products.summary', 'Summary')}
      </h2>

      <dl className="grid gap-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">
            {tDefault('merchant.products.summaryStatus', 'Status')}
          </dt>
          <dd>
            <ProductStatusBadge status={status} />
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">
            {tDefault('merchant.products.summaryPrice', 'Price')}
          </dt>
          <dd className="font-medium">{values.price.toFixed(2)}</dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">
            {tDefault('merchant.products.summaryVisibility', 'Visibility')}
          </dt>
          <dd>
            {values.isActive
              ? tDefault('merchant.products.visible', 'Visible')
              : tDefault('merchant.products.hidden', 'Hidden')}
          </dd>
        </div>

        {rows.map((row) => (
          <div className="flex items-center justify-between" key={row.label}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
