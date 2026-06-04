import type { FormEvent } from 'react';
import { useAppTranslation } from '@/app/i18n';
import type { ProductModifier, ProductModifierActiveFilter } from '@/models/productModifier';
import { getLocalizedText } from '@/models/metadata';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { Field } from '@/shared/components/form/Field';
import { FilterSelect } from '@/shared/components/form/FilterSelect';
import { OptionsSelect } from '@/shared/components/form/OptionsSelect';
import { LocalizedStringInput } from '@/shared/components/LocalizedStringInput';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useProductModifierListPageVM } from './useProductModifierListPageVM';

export function ProductModifierListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useProductModifierListPageVM();

  const visibilityOptions: { label: string; value: ProductModifierActiveFilter }[] = [
    {
      label: tDefault('merchant.productModifiers.activeOnly', 'Active'),
      value: 'true',
    },
    {
      label: tDefault('merchant.productModifiers.inactiveOnly', 'Inactive'),
      value: 'false',
    },
    { label: tDefault('merchant.productModifiers.all', 'All'), value: 'all' },
  ];

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

  const baseColumns: DataTableColumn<ProductModifier>[] = [
    {
      key: 'name',
      header: tDefault('merchant.productModifiers.name', 'Name'),
      className: 'pl-4',
      render: (modifier) => (
        <span className="truncate font-semibold">
          {getLocalizedText(modifier.name)}
        </span>
      ),
    },
    {
      key: 'selectionType',
      header: tDefault('merchant.productModifiers.selectionType', 'Type'),
      render: (modifier) =>
        modifier.selectionType === 'single_choice'
          ? tDefault('merchant.productModifiers.singleChoice', 'Single choice')
          : tDefault('merchant.productModifiers.multipleChoice', 'Multiple choice'),
    },
    {
      key: 'select',
      header: tDefault('merchant.productModifiers.selectRange', 'Select'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (modifier) => `${modifier.minSelect} – ${modifier.maxSelect}`,
    },
    {
      key: 'optionsCount',
      header: tDefault('merchant.productModifiers.options', 'Options'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (modifier) => String(modifier.options.length),
    },
    {
      key: 'status',
      header: tDefault('merchant.productModifiers.status', 'Status'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (modifier) =>
        modifier.isActive
          ? tDefault('merchant.productModifiers.active', 'Active')
          : tDefault('merchant.productModifiers.inactive', 'Inactive'),
    },
  ];

  const columns: DataTableColumn<ProductModifier>[] = vm.canManage
    ? [
        ...baseColumns,
        {
          key: 'actions',
          header: tDefault('common.table.actions', 'Actions'),
          align: 'right',
          className: 'pr-4',
          render: (modifier) => (
            <Button
              onClick={() => vm.openEditModal(modifier)}
              size="sm"
              type="button"
              variant="secondary"
            >
              {tDefault('common.actions.edit', 'Edit')}
            </Button>
          ),
        },
      ]
    : baseColumns;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void vm.submitModifier();
  }

  const { form } = vm;
  const isSingleChoice = form.values.selectionType === 'single_choice';

  if (vm.isLoading && vm.productModifiers.length === 0) {
    return (
      <LoadingState
        label={tDefault(
          'merchant.productModifiers.loading',
          'Loading modifiers',
        )}
      />
    );
  }

  return (
    <section className="admin-page-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
            {tDefault('merchant.productModifiers.title', 'Modifiers')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'merchant.productModifiers.description',
              'Define option groups customers choose from when ordering.',
            )}
          </p>
        </div>
        {vm.canManage ? (
          <Button onClick={vm.openCreateModal} type="button">
            {tDefault('merchant.productModifiers.create', 'Create modifier')}
          </Button>
        ) : null}
      </div>

      {vm.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        data={vm.productModifiers}
        isLoading={vm.isLoading}
        labels={{
          empty: tDefault(
            'merchant.productModifiers.empty',
            'No modifiers found.',
          ),
        }}
        rowKey={(modifier) => modifier.id}
        toolbar={
          <FilterSelect
            onChange={vm.setFilter}
            options={visibilityOptions}
            value={vm.filter}
          />
        }
      />

      <Modal
        footer={
          <>
            <Button onClick={vm.closeModal} type="button" variant="ghost">
              {tDefault('common.actions.cancel', 'Cancel')}
            </Button>
            <Button
              disabled={form.isSubmitting}
              form="product-modifier-form"
              type="submit"
            >
              {form.isSubmitting
                ? tDefault('common.actions.saving', 'Saving...')
                : tDefault('common.actions.save', 'Save')}
            </Button>
          </>
        }
        isOpen={vm.isModalOpen}
        onClose={vm.closeModal}
        size="lg"
        title={vm.modalTitle}
      >
        <form
          className="grid gap-5"
          id="product-modifier-form"
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

          <Field
            label={tDefault(
              'merchant.productModifiers.selectionType',
              'Type',
            )}
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
                  }
                }}
                options={selectionTypeOptions}
                value={form.values.selectionType}
              />
            }
          />

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
                  disabled={form.isSubmitting || isSingleChoice}
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

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              checked={form.values.isActive}
              className="h-4 w-4"
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
                {tDefault(
                  'merchant.productModifiers.noOptions',
                  'Add at least one option.',
                )}
              </p>
            ) : null}

            {form.values.options.map((option, index) => (
              <div
                key={option.id ?? index}
                className="grid gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {tDefault('merchant.productModifiers.optionLabel', 'Option')}{' '}
                    {index + 1}
                  </span>
                  <Button
                    disabled={form.isSubmitting || form.values.options.length <= 1}
                    onClick={() => form.removeOption(index)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {tDefault('common.actions.remove', 'Remove')}
                  </Button>
                </div>

                <Field
                  label={tDefault('merchant.productModifiers.optionName', 'Name')}
                  required
                  renderControl={
                    <LocalizedStringInput
                      defaultLocale="zh-TW"
                      disabled={form.isSubmitting}
                      onChange={(value) =>
                        form.setOptionField(index, 'name', value)
                      }
                      value={option.name}
                    />
                  }
                />

                <Field
                  label={tDefault(
                    'merchant.productModifiers.priceAdjustment',
                    'Price adjustment',
                  )}
                  required
                  renderControl={
                    <Input
                      disabled={form.isSubmitting}
                      onChange={(e) =>
                        form.setOptionField(
                          index,
                          'priceAdjustment',
                          Number(e.target.value),
                        )
                      }
                      step="1"
                      type="number"
                      value={option.priceAdjustment}
                    />
                  }
                />

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      checked={option.isDefault}
                      className="h-4 w-4"
                      onChange={(e) =>
                        form.setOptionField(index, 'isDefault', e.target.checked)
                      }
                      type="checkbox"
                    />
                    {tDefault('merchant.productModifiers.isDefault', 'Default')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      checked={option.isActive}
                      className="h-4 w-4"
                      onChange={(e) =>
                        form.setOptionField(index, 'isActive', e.target.checked)
                      }
                      type="checkbox"
                    />
                    {tDefault('merchant.productModifiers.optionActive', 'Active')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      checked={option.isSoldOut}
                      className="h-4 w-4"
                      onChange={(e) =>
                        form.setOptionField(index, 'isSoldOut', e.target.checked)
                      }
                      type="checkbox"
                    />
                    {tDefault(
                      'merchant.productModifiers.isSoldOut',
                      'Sold out',
                    )}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>
    </section>
  );
}
