import { useAppTranslation } from '@/app/i18n';
import { Field } from '@/shared/components/form/Field';
import { OptionsSelect } from '@/shared/components/form/OptionsSelect';
import { Input } from '@/shared/components/ui/input';
import type { ProductModifierForm } from './useProductModifierForm';

type Props = {
  form: Pick<
    ProductModifierForm,
    'values' | 'setField' | 'fieldErrors' | 'isSubmitting'
  >;
};

export function ModifierSelectionTypeFields({ form }: Props) {
  const { tDefault } = useAppTranslation();
  const isSingleChoice = form.values.selectionType === 'single_choice';

  const selectionTypeOptions = [
    {
      label: tDefault('merchant.productModifiers.singleChoice', 'Single choice'),
      value: 'single_choice',
    },
    {
      label: tDefault('merchant.productModifiers.multipleChoice', 'Multiple choice'),
      value: 'multiple_choice',
    },
  ];

  return (
    <>
      <Field
        label={tDefault('merchant.productModifiers.selectionType', 'Type')}
        required
        renderControl={
          <OptionsSelect
            disabled={form.isSubmitting}
            onValueChange={(value) => {
              form.setField(
                'selectionType',
                value as 'single_choice' | 'multiple_choice',
              );
              if (value === 'single_choice') {
                form.setField('maxSelect', 1);
                form.setField('minSelect', Math.min(form.values.minSelect, 1));
              }
            }}
            options={selectionTypeOptions}
            value={form.values.selectionType}
          />
        }
      />

      {isSingleChoice ? (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            checked={form.values.minSelect === 1}
            className="h-4 w-4"
            disabled={form.isSubmitting}
            onChange={(e) =>
              form.setField('minSelect', e.target.checked ? 1 : 0)
            }
            type="checkbox"
          />
          {tDefault('merchant.productModifiers.required', 'Required')}
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Field
            error={form.fieldErrors.minSelect}
            label={tDefault(
              'merchant.productModifiers.minSelect',
              'Min selections',
            )}
            required
            renderControl={
              <Input
                disabled={form.isSubmitting}
                min={0}
                onChange={(e) =>
                  form.setField('minSelect', Number(e.target.value))
                }
                type="number"
                value={form.values.minSelect}
              />
            }
          />
          <Field
            label={tDefault(
              'merchant.productModifiers.maxSelect',
              'Max selections',
            )}
            required
            renderControl={
              <Input
                disabled={form.isSubmitting}
                min={1}
                onChange={(e) =>
                  form.setField('maxSelect', Number(e.target.value))
                }
                type="number"
                value={form.values.maxSelect}
              />
            }
          />
        </div>
      )}
    </>
  );
}
