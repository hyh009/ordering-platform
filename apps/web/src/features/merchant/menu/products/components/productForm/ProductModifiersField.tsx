import { useAppTranslation } from '@/app/i18n';
import { getLocalizedText } from '@/models/metadata';
import { useActiveStoreLocale } from '@/app/global/activeStore/useActiveStoreLocale';
import { Field } from '@/shared/components/form/Field';
import { MultiSelect } from '@/shared/components/form/MultiSelect';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import type { ProductForm } from './useProductForm';
import type { ProductFormOptions } from './useProductFormOptions';

type Props = {
  form: ProductForm;
  formOptions: ProductFormOptions;
};

export function ProductModifiersField({ form, formOptions }: Props) {
  const { tDefault } = useAppTranslation();
  const locale = useActiveStoreLocale();

  const selectedModifiers = form.values.modifierIds
    .map((id) => formOptions.modifiersById.get(id))
    .filter((modifier) => modifier !== undefined);

  return (
    <div className="grid gap-5 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold">
        {tDefault('merchant.products.modifiers', 'Modifiers')}
      </h2>

      <Field
        label={tDefault('merchant.products.attachModifiers', 'Attach modifiers')}
        renderControl={
          <MultiSelect
            disabled={form.isSubmitting || formOptions.isLoading}
            onChange={(value) => form.setField('modifierIds', value)}
            options={formOptions.modifiers}
            placeholder={tDefault(
              'merchant.products.modifiersPlaceholder',
              'Add modifiers',
            )}
            value={form.values.modifierIds}
          />
        }
      />

      {selectedModifiers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {tDefault('merchant.products.modifierName', 'Name')}
              </TableHead>
              <TableHead>
                {tDefault('merchant.products.modifierType', 'Type')}
              </TableHead>
              <TableHead>
                {tDefault('merchant.products.modifierSelection', 'Selection')}
              </TableHead>
              <TableHead>
                {tDefault('merchant.products.modifierStatus', 'Status')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedModifiers.map((modifier) => (
              <TableRow key={modifier.id}>
                <TableCell>{getLocalizedText(modifier.name, locale.defaultLocale)}</TableCell>
                <TableCell>
                  {modifier.selectionType === 'single_choice'
                    ? tDefault('merchant.products.singleChoice', 'Single')
                    : tDefault('merchant.products.multipleChoice', 'Multiple')}
                </TableCell>
                <TableCell>
                  {modifier.minSelect >= 1
                    ? tDefault('merchant.products.required', 'Required')
                    : tDefault('merchant.products.optional', 'Optional')}{' '}
                  ({modifier.minSelect}–{modifier.maxSelect})
                </TableCell>
                <TableCell>
                  <Badge variant={modifier.isActive ? 'secondary' : 'outline'}>
                    {modifier.isActive
                      ? tDefault('merchant.products.statusActive', 'Active')
                      : tDefault('merchant.products.statusInactive', 'Inactive')}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
