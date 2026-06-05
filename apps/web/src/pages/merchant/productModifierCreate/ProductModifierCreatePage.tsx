import type { FormEvent } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { ModifierOptionsEditTable } from '@/features/menu/components/productModifierForm/ModifierOptionsEditTable';
import { ModifierSelectionTypeFields } from '@/features/menu/components/productModifierForm/ModifierSelectionTypeFields';
import { LocalizedStringInput } from '@/shared/components/LocalizedStringInput';
import { Field } from '@/shared/components/form/Field';
import { Button } from '@/shared/components/ui/button';
import { useProductModifierCreatePageVM } from './useProductModifierCreatePageVM';

export function ProductModifierCreatePage() {
  const { tDefault } = useAppTranslation();
  const vm = useProductModifierCreatePageVM();
  const { form } = vm;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void vm.submitModifier();
  }

  return (
    <section className="admin-page-content">
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={vm.goBack} size="sm" type="button" variant="ghost">
          <ChevronLeft className="size-4" />
          {tDefault('merchant.productModifiers.title', 'Modifiers')}
        </Button>
      </div>

      <h1 className="text-3xl font-bold leading-tight md:text-4xl mb-6">
        {tDefault('merchant.productModifiers.createTitle', 'Create modifier')}
      </h1>

      <form
        className="grid gap-5 max-w-2xl"
        id="modifier-create-form"
        onSubmit={handleSubmit}
      >
        {form.submitError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {form.submitError}
          </p>
        ) : null}

        <Field
          error={form.fieldErrors.name}
          label={tDefault('merchant.productModifiers.name', 'Name')}
          required
          renderControl={
            <LocalizedStringInput
              defaultLocale="zh-TW"
              disabled={form.isSubmitting}
              onChange={(value) => form.setField('name', value)}
              value={form.values.name}
            />
          }
        />

        <ModifierSelectionTypeFields form={form} />

        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {tDefault('merchant.productModifiers.optionsSection', 'Options')}
            </h3>
            <Button
              disabled={form.isSubmitting}
              onClick={form.addOption}
              size="sm"
              type="button"
              variant="secondary"
            >
              {tDefault('merchant.productModifiers.addOption', '+ Add option')}
            </Button>
          </div>

          {form.fieldErrors.options ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {form.fieldErrors.options}
            </p>
          ) : null}

          {form.values.options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tDefault('merchant.productModifiers.noOptions', 'Add at least one option.')}
            </p>
          ) : (
            <ModifierOptionsEditTable form={form} />
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            disabled={form.isSubmitting}
            form="modifier-create-form"
            type="submit"
          >
            {form.isSubmitting
              ? tDefault('common.actions.saving', 'Saving...')
              : tDefault('merchant.productModifiers.create', 'Create modifier')}
          </Button>
          <Button
            disabled={form.isSubmitting}
            onClick={vm.goBack}
            type="button"
            variant="ghost"
          >
            {tDefault('common.actions.cancel', 'Cancel')}
          </Button>
        </div>
      </form>
    </section>
  );
}
