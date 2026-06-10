import { useAppTranslation } from '@/app/i18n';
import { Field } from '@/shared/components/form/Field';
import { Input } from '@/shared/components/ui/input';
import type { ProductForm } from './useProductForm';

type Props = {
  form: ProductForm;
};

export function ProductImageField({ form }: Props) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="grid gap-5 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold">
        {tDefault('merchant.products.image', 'Image')}
      </h2>

      <Field
        description={tDefault(
          'merchant.products.imageHint',
          'Paste a public image URL. Uploads are coming soon.',
        )}
        error={form.fieldErrors.imageUrl}
        label={tDefault('merchant.products.imageUrl', 'Image URL')}
        renderControl={
          <Input
            disabled={form.isSubmitting}
            onChange={(e) => form.setField('imageUrl', e.target.value)}
            placeholder="https://"
            type="url"
            value={form.values.imageUrl}
          />
        }
      />
    </div>
  );
}
