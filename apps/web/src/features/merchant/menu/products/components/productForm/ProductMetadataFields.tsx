import { useAppTranslation } from '@/app/i18n';
import { Field } from '@/shared/components/form/Field';
import { MultiSelect } from '@/shared/components/form/MultiSelect';
import type { ProductForm } from './useProductForm';
import type { ProductFormOptions } from './useProductFormOptions';

type Props = {
  form: ProductForm;
  formOptions: ProductFormOptions;
};

export function ProductMetadataFields({ form, formOptions }: Props) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="grid gap-5 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold">
        {tDefault('merchant.products.metadata', 'Metadata')}
      </h2>

      <Field
        label={tDefault('merchant.products.categories', 'Categories')}
        renderControl={
          <MultiSelect
            disabled={form.isSubmitting || formOptions.isLoading}
            onChange={(value) => form.setField('categoryIds', value)}
            options={formOptions.categories}
            placeholder={tDefault(
              'merchant.products.categoriesPlaceholder',
              'Add categories',
            )}
            value={form.values.categoryIds}
          />
        }
      />

      <Field
        label={tDefault('merchant.products.tags', 'Tags')}
        renderControl={
          <MultiSelect
            disabled={form.isSubmitting || formOptions.isLoading}
            onChange={(value) => form.setField('tagIds', value)}
            options={formOptions.tags}
            placeholder={tDefault(
              'merchant.products.tagsPlaceholder',
              'Add tags',
            )}
            value={form.values.tagIds}
          />
        }
      />

      <Field
        label={tDefault('merchant.products.allergens', 'Allergens')}
        renderControl={
          <MultiSelect
            disabled={form.isSubmitting || formOptions.isLoading}
            onChange={(value) => form.setField('allergenIds', value)}
            options={formOptions.allergens}
            placeholder={tDefault(
              'merchant.products.allergensPlaceholder',
              'Add allergens',
            )}
            value={form.values.allergenIds}
          />
        }
      />

      <Field
        label={tDefault('merchant.products.dietaryMarkers', 'Dietary markers')}
        renderControl={
          <MultiSelect
            disabled={form.isSubmitting || formOptions.isLoading}
            onChange={(value) => form.setField('dietaryMarkerIds', value)}
            options={formOptions.dietaryMarkers}
            placeholder={tDefault(
              'merchant.products.dietaryMarkersPlaceholder',
              'Add dietary markers',
            )}
            value={form.values.dietaryMarkerIds}
          />
        }
      />
    </div>
  );
}
