import { useAppTranslation } from '@/app/i18n';
import { LocalizedStringInput } from '@/shared/components/LocalizedStringInput';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { ProductModifierForm } from './useProductModifierForm';

type Props = {
  form: Pick<
    ProductModifierForm,
    'values' | 'setOptionField' | 'removeOption' | 'isSubmitting'
  >;
};

export function ModifierOptionsEditTable({ form }: Props) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              {tDefault('merchant.productModifiers.optionName', 'Name')}
            </th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">
              {tDefault('merchant.productModifiers.priceAdjustment', 'Price adj.')}
            </th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground w-20">
              {tDefault('merchant.productModifiers.isDefault', 'Default')}
            </th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground w-16">
              {tDefault('merchant.productModifiers.optionActive', 'Active')}
            </th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground w-20">
              {tDefault('merchant.productModifiers.isSoldOut', 'Sold out')}
            </th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {form.values.options.map((option, index) => (
            <tr
              key={option.id ?? index}
              className="border-b border-border last:border-0"
            >
              <td className="px-3 py-2">
                <LocalizedStringInput
                  defaultLocale="zh-TW"
                  disabled={form.isSubmitting}
                  onChange={(value) => form.setOptionField(index, 'name', value)}
                  value={option.name}
                />
              </td>
              <td className="px-3 py-2">
                <Input
                  className="w-24 text-right"
                  disabled={form.isSubmitting}
                  onChange={(e) =>
                    form.setOptionField(index, 'priceAdjustment', Number(e.target.value))
                  }
                  step="1"
                  type="number"
                  value={option.priceAdjustment}
                />
              </td>
              <td className="px-3 py-2 text-center">
                <input
                  checked={option.isDefault}
                  className="h-4 w-4"
                  disabled={form.isSubmitting}
                  onChange={(e) => form.setOptionField(index, 'isDefault', e.target.checked)}
                  type="checkbox"
                />
              </td>
              <td className="px-3 py-2 text-center">
                <input
                  checked={option.isActive}
                  className="h-4 w-4"
                  disabled={form.isSubmitting}
                  onChange={(e) => form.setOptionField(index, 'isActive', e.target.checked)}
                  type="checkbox"
                />
              </td>
              <td className="px-3 py-2 text-center">
                <input
                  checked={option.isSoldOut}
                  className="h-4 w-4"
                  disabled={form.isSubmitting}
                  onChange={(e) => form.setOptionField(index, 'isSoldOut', e.target.checked)}
                  type="checkbox"
                />
              </td>
              <td className="px-3 py-2 text-center">
                <Button
                  disabled={form.isSubmitting || form.values.options.length <= 1}
                  onClick={() => form.removeOption(index)}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  ×
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
