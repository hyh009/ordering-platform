import type { FormEvent } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { ModifierOptionsEditTable } from '@/features/menu/components/productModifierForm/ModifierOptionsEditTable';
import { ModifierSelectionTypeFields } from '@/features/menu/components/productModifierForm/ModifierSelectionTypeFields';
import { getLocalizedText } from '@/models/metadata';
import type { ProductModifier } from '@/models/productModifier';
import { LocalizedStringInput } from '@/shared/components/LocalizedStringInput';
import { Field } from '@/shared/components/form/Field';
import { LoadingState } from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { useProductModifierDetailPageVM } from './useProductModifierDetailPageVM';

function OptionValueDisplay({ value }: { value: boolean }) {
  return value ? (
    <span className="text-emerald-600">✓</span>
  ) : (
    <span className="text-muted-foreground">–</span>
  );
}

function ModifierViewMode({ modifier }: { modifier: ProductModifier }) {
  const { tDefault } = useAppTranslation();
  const isSingleChoice = modifier.selectionType === 'single_choice';

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {tDefault('merchant.productModifiers.basicInfo', 'Basic information')}
        </h2>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-muted-foreground mb-0.5">
              {tDefault('merchant.productModifiers.name', 'Name')}
            </p>
            <p className="font-medium">{getLocalizedText(modifier.name)}</p>
            {modifier.name.en && modifier.name['zh-TW'] && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {modifier.name.en}
              </p>
            )}
          </div>

          <div>
            <p className="text-muted-foreground mb-0.5">
              {tDefault('merchant.productModifiers.selectionType', 'Type')}
            </p>
            <p className="font-medium">
              {isSingleChoice
                ? tDefault('merchant.productModifiers.singleChoice', 'Single choice')
                : tDefault('merchant.productModifiers.multipleChoice', 'Multiple choice')}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground mb-0.5">
              {isSingleChoice
                ? tDefault('merchant.productModifiers.required', 'Required')
                : tDefault('merchant.productModifiers.selectRange', 'Select range')}
            </p>
            <p className="font-medium">
              {isSingleChoice
                ? modifier.minSelect === 1
                  ? tDefault('common.yes', 'Yes')
                  : tDefault('common.no', 'No')
                : `${modifier.minSelect} – ${modifier.maxSelect}`}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground mb-0.5">
              {tDefault('merchant.productModifiers.status', 'Status')}
            </p>
            <p className="font-medium">
              {modifier.isActive
                ? tDefault('merchant.productModifiers.active', 'Active')
                : tDefault('merchant.productModifiers.inactive', 'Inactive')}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold">
            {tDefault('merchant.productModifiers.optionsSection', 'Options')}{' '}
            <span className="text-muted-foreground font-normal">
              ({modifier.options.length})
            </span>
          </h2>
        </div>

        {modifier.options.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">
            {tDefault('merchant.productModifiers.noOptions', 'No options.')}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  {tDefault('merchant.productModifiers.optionName', 'Name')}
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  {tDefault('merchant.productModifiers.priceAdjustment', 'Price adj.')}
                </th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                  {tDefault('merchant.productModifiers.isDefault', 'Default')}
                </th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                  {tDefault('merchant.productModifiers.optionActive', 'Active')}
                </th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                  {tDefault('merchant.productModifiers.isSoldOut', 'Sold out')}
                </th>
              </tr>
            </thead>
            <tbody>
              {modifier.options.map((option, index) => (
                <tr
                  key={option.id}
                  className={index % 2 === 0 ? '' : 'bg-muted/10'}
                >
                  <td className="px-4 py-2.5 font-medium">
                    {getLocalizedText(option.name)}
                    {option.name.en && option.name['zh-TW'] && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {option.name.en}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {option.priceAdjustment > 0
                      ? `+${option.priceAdjustment}`
                      : option.priceAdjustment === 0
                        ? '–'
                        : String(option.priceAdjustment)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <OptionValueDisplay value={option.isDefault} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <OptionValueDisplay value={option.isActive} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <OptionValueDisplay value={option.isSoldOut} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function ProductModifierDetailPage() {
  const { tDefault } = useAppTranslation();
  const vm = useProductModifierDetailPageVM();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void vm.saveModifier();
  }

  if (vm.isLoading && !vm.modifier) {
    return (
      <LoadingState
        label={tDefault('merchant.productModifiers.loading', 'Loading modifier')}
      />
    );
  }

  const { form } = vm;

  return (
    <section className="admin-page-content">
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={vm.goBack} size="sm" type="button" variant="ghost">
          <ChevronLeft className="size-4" />
          {tDefault('merchant.productModifiers.title', 'Modifiers')}
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            {vm.pageTitle || tDefault('merchant.productModifiers.untitled', 'Modifier')}
          </h1>
        </div>

        {vm.canManage && !vm.isEditMode && (
          <Button onClick={vm.enterEditMode} type="button">
            {tDefault('common.actions.edit', 'Edit')}
          </Button>
        )}
      </div>

      {vm.error && !vm.modifier ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.error}
        </p>
      ) : null}

      {vm.modifier && !vm.isEditMode ? (
        <ModifierViewMode modifier={vm.modifier} />
      ) : null}

      {vm.isEditMode ? (
        <form className="grid gap-5 max-w-2xl" id="modifier-edit-form" onSubmit={handleSubmit}>
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

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              checked={form.values.isActive}
              className="h-4 w-4"
              disabled={form.isSubmitting}
              onChange={(e) => form.setField('isActive', e.target.checked)}
              type="checkbox"
            />
            {tDefault('merchant.productModifiers.isActive', 'Active')}
          </label>

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
              form="modifier-edit-form"
              type="submit"
            >
              {form.isSubmitting
                ? tDefault('common.actions.saving', 'Saving...')
                : tDefault('common.actions.save', 'Save')}
            </Button>
            <Button
              disabled={form.isSubmitting}
              onClick={vm.cancelEdit}
              type="button"
              variant="ghost"
            >
              {tDefault('common.actions.cancel', 'Cancel')}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
