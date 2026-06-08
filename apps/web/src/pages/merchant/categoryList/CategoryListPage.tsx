import type { FormEvent } from 'react';
import { useAppTranslation } from '@/app/i18n';
import type { Category, CategoryActiveFilter } from '@/models/category';
import { getLocalizedText } from '@/models/metadata';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { Field } from '@/shared/components/form/Field';
import { FilterSelect } from '@/shared/components/form/FilterSelect';
import { LocalizedStringInput } from '@/shared/components/LocalizedStringInput';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/button';
import { useCategoryListPageVM } from './useCategoryListPageVM';

export function CategoryListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useCategoryListPageVM();

  const visibilityOptions: { label: string; value: CategoryActiveFilter }[] = [
    {
      label: tDefault('merchant.categories.activeOnly', 'Active'),
      value: 'true',
    },
    {
      label: tDefault('merchant.categories.inactiveOnly', 'Inactive'),
      value: 'false',
    },
    { label: tDefault('merchant.categories.all', 'All'), value: 'all' },
  ];

  const baseColumns: DataTableColumn<Category>[] = [
    {
      key: 'name',
      header: tDefault('merchant.categories.name', 'Name'),
      className: 'pl-4',
      render: (category) => (
        <span className="truncate font-semibold">
          {getLocalizedText(category.name)}
        </span>
      ),
    },
    {
      key: 'status',
      header: tDefault('merchant.categories.status', 'Status'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (category) =>
        category.isActive
          ? tDefault('merchant.categories.active', 'Active')
          : tDefault('merchant.categories.inactive', 'Inactive'),
    },
  ];

  const normalColumns: DataTableColumn<Category>[] = vm.canManage
    ? [
        ...baseColumns,
        {
          key: 'actions',
          header: tDefault('common.table.actions', 'Actions'),
          align: 'right',
          className: 'pr-4',
          render: (category) => (
            <Button
              onClick={() => vm.openEditModal(category)}
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

  const reorderColumns: DataTableColumn<Category>[] = [
    ...baseColumns,
    {
      key: 'reorderActions',
      header: '',
      align: 'right',
      className: 'pr-4',
      render: (category) => {
        const isFirst = vm.categories[0]?.id === category.id;
        const isLast =
          vm.categories[vm.categories.length - 1]?.id === category.id;

        return (
          <div className="flex justify-end gap-1">
            <Button
              disabled={isFirst}
              onClick={() => vm.moveCategory(category.id, 'up')}
              size="sm"
              title={tDefault('merchant.categories.moveUp', 'Move up')}
              type="button"
              variant="ghost"
            >
              ↑
            </Button>
            <Button
              disabled={isLast}
              onClick={() => vm.moveCategory(category.id, 'down')}
              size="sm"
              title={tDefault('merchant.categories.moveDown', 'Move down')}
              type="button"
              variant="ghost"
            >
              ↓
            </Button>
          </div>
        );
      },
    },
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void vm.submitCategory();
  }

  if (vm.isLoading && vm.categories.length === 0) {
    return (
      <LoadingState
        label={tDefault('merchant.categories.loading', 'Loading categories')}
      />
    );
  }

  const toolbar = vm.isReorderMode ? (
    <div className="flex gap-2">
      <Button
        disabled={vm.isReorderSubmitting}
        onClick={vm.cancelReorder}
        type="button"
        variant="ghost"
      >
        {tDefault('common.actions.cancel', 'Cancel')}
      </Button>
      <Button
        disabled={vm.isReorderSubmitting}
        onClick={() => void vm.saveReorder()}
        type="button"
      >
        {vm.isReorderSubmitting
          ? tDefault('common.actions.saving', 'Saving...')
          : tDefault('merchant.categories.saveOrder', 'Save order')}
      </Button>
    </div>
  ) : (
    <div className="flex gap-2">
      <FilterSelect
        onChange={vm.setFilter}
        options={visibilityOptions}
        value={vm.filter}
      />
      {vm.canManage ? (
        <Button onClick={vm.enterReorderMode} type="button" variant="secondary">
          {tDefault('merchant.categories.reorder', 'Reorder')}
        </Button>
      ) : null}
    </div>
  );

  return (
    <section className="admin-page-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
            {tDefault('merchant.categories.title', 'Categories')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'merchant.categories.description',
              'Group menu items into the sections customers browse.',
            )}
          </p>
        </div>
        {vm.canManage && !vm.isReorderMode ? (
          <Button onClick={vm.openCreateModal} type="button">
            {tDefault('merchant.categories.create', 'Create category')}
          </Button>
        ) : null}
      </div>

      {vm.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.error}
        </p>
      ) : null}

      {vm.reorderError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.reorderError}
        </p>
      ) : null}

      <DataTable
        columns={vm.isReorderMode ? reorderColumns : normalColumns}
        data={vm.categories}
        isLoading={vm.isLoading}
        labels={{
          empty: tDefault('merchant.categories.empty', 'No categories found.'),
        }}
        rowKey={(category) => category.id}
        toolbar={toolbar}
      />

      <Modal
        footer={
          <>
            <Button onClick={vm.closeModal} type="button" variant="ghost">
              {tDefault('common.actions.cancel', 'Cancel')}
            </Button>
            <Button
              disabled={vm.form.isSubmitting}
              form="category-form"
              type="submit"
            >
              {vm.form.isSubmitting
                ? tDefault('common.actions.saving', 'Saving...')
                : tDefault('common.actions.save', 'Save')}
            </Button>
          </>
        }
        isOpen={vm.isModalOpen}
        onClose={vm.closeModal}
        title={vm.modalTitle}
      >
        <form className="grid gap-4" id="category-form" onSubmit={handleSubmit}>
          {vm.form.submitError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {vm.form.submitError}
            </p>
          ) : null}
          <Field
            error={vm.form.fieldErrors.name}
            label={tDefault('merchant.categories.name', 'Name')}
            required
            renderControl={
              <LocalizedStringInput
                defaultLocale="zh-TW"
                disabled={vm.form.isSubmitting}
                onChange={(value) => vm.form.setField('name', value)}
                value={vm.form.values.name}
              />
            }
          />
          <Field
            error={vm.form.fieldErrors.description}
            label={tDefault(
              'merchant.categories.descriptionLabel',
              'Description',
            )}
            renderControl={
              <LocalizedStringInput
                defaultLocale="zh-TW"
                disabled={vm.form.isSubmitting}
                onChange={(value) => vm.form.setField('description', value)}
                value={vm.form.values.description}
              />
            }
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              checked={vm.form.values.isActive}
              className="h-4 w-4"
              onChange={(event) => {
                vm.form.setField('isActive', event.target.checked);
              }}
              type="checkbox"
            />
            {tDefault('merchant.categories.isActive', 'Active')}
          </label>
        </form>
      </Modal>
    </section>
  );
}
