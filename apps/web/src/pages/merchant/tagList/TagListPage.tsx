import type { FormEvent } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { getTagName } from '@/models/tag';
import type { Tag, TagActiveFilter } from '@/models/tag';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { Field } from '@/shared/components/form/Field';
import { FilterSelect } from '@/shared/components/form/FilterSelect';
import { LocalizedStringInput } from '@/shared/components/LocalizedStringInput';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useTagListPageVM } from './useTagListPageVM';

export function TagListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useTagListPageVM();

  const visibilityOptions: { label: string; value: TagActiveFilter }[] = [
    { label: tDefault('merchant.tags.activeOnly', 'Active'), value: 'true' },
    {
      label: tDefault('merchant.tags.inactiveOnly', 'Inactive'),
      value: 'false',
    },
    { label: tDefault('merchant.tags.all', 'All'), value: 'all' },
  ];

  const columns: DataTableColumn<Tag>[] = [
    {
      key: 'name',
      header: tDefault('merchant.tags.name', 'Name'),
      className: 'pl-4',
      render: (tag) => (
        <div className="flex min-w-0 items-center gap-2">
          {tag.color ? (
            <span
              aria-hidden
              className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: tag.color }}
            />
          ) : null}
          <span className="truncate font-semibold">{getTagName(tag.name)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: tDefault('merchant.tags.status', 'Status'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (tag) =>
        tag.isActive
          ? tDefault('merchant.tags.active', 'Active')
          : tDefault('merchant.tags.inactive', 'Inactive'),
    },
  ];

  // Edit action is only available to managers; staff get a read-only table.
  if (vm.canManage) {
    columns.push({
      key: 'actions',
      header: tDefault('common.table.actions', 'Actions'),
      align: 'right',
      className: 'pr-4',
      render: (tag) => (
        <Button
          onClick={() => {
            vm.openEditModal(tag);
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          {tDefault('common.actions.edit', 'Edit')}
        </Button>
      ),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void vm.submitTag();
  }

  if (vm.isLoading && vm.tags.length === 0) {
    return (
      <LoadingState label={tDefault('merchant.tags.loading', 'Loading tags')} />
    );
  }

  return (
    <section className="admin-page-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
            {tDefault('merchant.tags.title', 'Tags')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'merchant.tags.description',
              'Manage labels used to group and highlight menu items.',
            )}
          </p>
        </div>
        {vm.canManage ? (
          <Button onClick={vm.openCreateModal} type="button">
            {tDefault('merchant.tags.create', 'Create tag')}
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
        data={vm.tags}
        isLoading={vm.isLoading}
        labels={{ empty: tDefault('merchant.tags.empty', 'No tags found.') }}
        rowKey={(tag) => tag.id}
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
              disabled={vm.form.isSubmitting}
              form="tag-form"
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
        <form className="grid gap-4" id="tag-form" onSubmit={handleSubmit}>
          {vm.form.submitError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {vm.form.submitError}
            </p>
          ) : null}
          <Field
            error={vm.form.fieldErrors.name}
            label={tDefault('merchant.tags.name', 'Name')}
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
            error={vm.form.fieldErrors.color}
            label={tDefault('merchant.tags.color', 'Color')}
          >
            <Input
              onChange={(event) => {
                vm.form.setField('color', event.target.value);
              }}
              placeholder="#1A2B3C"
              value={vm.form.values.color}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              checked={vm.form.values.isActive}
              className="h-4 w-4"
              onChange={(event) => {
                vm.form.setField('isActive', event.target.checked);
              }}
              type="checkbox"
            />
            {tDefault('merchant.tags.isActive', 'Active')}
          </label>
        </form>
      </Modal>
    </section>
  );
}
