import { useEffect, useState } from 'react';
import { useAppTranslation } from '@/app/i18n';
import type { StoreLocaleDto } from '@/models/store';
import { LocalizedStringInput } from '@/shared/components/LocalizedStringInput';
import { Field } from '@/shared/components/form/Field';
import { Input } from '@/shared/components/ui/input';
import type { ProductForm } from './useProductForm';

type Props = {
  form: ProductForm;
  locale: StoreLocaleDto;
};

const DIGITS_ONLY = /^\d*$/;

export function ProductBasicInfoFields({ form, locale }: Props) {
  const { tDefault } = useAppTranslation();

  // A number input bound straight to `form.values.price` can't represent an
  // empty field: clearing it yields `Number('') === 0`, snapping the value
  // back to "0" on every keystroke and garbling further typing (e.g. "025").
  // Buffer the raw digits locally so the field can be blank while editing,
  // and only commit to form state once the text is a valid whole number.
  const [priceText, setPriceText] = useState(String(form.values.price));

  useEffect(() => {
    setPriceText(String(form.values.price));
  }, [form.values.price]);

  return (
    <div className="grid gap-5 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold">
        {tDefault('merchant.products.basicInfo', 'Basic information')}
      </h2>

      <Field
        error={form.fieldErrors.name}
        label={tDefault('merchant.products.name', 'Name')}
        required
        renderControl={
          <LocalizedStringInput
            allowedLocales={locale.supportedLocales}
            defaultLocale={locale.defaultLocale}
            disabled={form.isSubmitting}
            onChange={(value) => form.setField('name', value)}
            value={form.values.name}
          />
        }
      />

      <Field
        label={tDefault('merchant.products.description', 'Description')}
        renderControl={
          <LocalizedStringInput
            allowedLocales={locale.supportedLocales}
            defaultLocale={locale.defaultLocale}
            disabled={form.isSubmitting}
            multiline
            onChange={(value) => form.setField('description', value)}
            value={form.values.description}
          />
        }
      />

      <Field
        error={form.fieldErrors.price}
        label={tDefault('merchant.products.price', 'Price')}
        required
        renderControl={
          <Input
            disabled={form.isSubmitting}
            inputMode="numeric"
            onBlur={() => {
              if (priceText === '') setPriceText(String(form.values.price));
            }}
            onChange={(e) => {
              const raw = e.target.value;
              if (!DIGITS_ONLY.test(raw)) return;
              setPriceText(raw);
              if (raw !== '') form.setField('price', Number(raw));
            }}
            type="text"
            value={priceText}
          />
        }
      />

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          checked={form.values.isActive}
          className="h-4 w-4"
          disabled={form.isSubmitting}
          onChange={(e) => form.setField('isActive', e.target.checked)}
          type="checkbox"
        />
        {tDefault('merchant.products.active', 'Visible to customers')}
      </label>
    </div>
  );
}
