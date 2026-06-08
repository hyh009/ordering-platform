import type { FormEvent } from 'react';
import { useAppTranslation } from '@/app/i18n';
import {
  dietaryMarkerTypes,
  getLocalizedText,
  getMetadataVisibilityOptions,
} from '@/models/metadata';
import type { DietaryMarker, DietaryMarkerType } from '@/models/metadata';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { Field } from '@/shared/components/form/Field';
import { FilterSelect } from '@/shared/components/form/FilterSelect';
import { LocalizedStringInput } from '@/shared/components/LocalizedStringInput';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useDietaryMarkerListPageVM } from './useDietaryMarkerListPageVM';

export function DietaryMarkerListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useDietaryMarkerListPageVM();

  const columns: DataTableColumn<DietaryMarker>[] = [
    {
      key: 'name',
      header: tDefault('admin.metadata.name', 'Name'),
      className: 'pl-4',
      render: (marker) => (
        <div className="min-w-0">
          <p className="m-0 truncate font-semibold">
            {getLocalizedText(marker.name)}
          </p>
          {marker.icon ? (
            <p className="m-0 text-sm text-muted-foreground">{marker.icon}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'key',
      header: tDefault('admin.metadata.key', 'Key'),
      render: (marker) => (
        <code className="truncate text-sm text-muted-foreground">
          {marker.key}
        </code>
      ),
    },
    {
      key: 'type',
      header: tDefault('admin.dietaryMarkers.type', 'Type'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (marker) => marker.type,
    },
    {
      key: 'status',
      header: tDefault('admin.metadata.status', 'Status'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (marker) =>
        marker.isActive
          ? tDefault('admin.metadata.active', 'Active')
          : tDefault('admin.metadata.inactive', 'Inactive'),
    },
    {
      key: 'actions',
      header: tDefault('common.table.actions', 'Actions'),
      align: 'right',
      className: 'pr-4',
      render: (marker) => (
        <Button
          onClick={() => {
            vm.openEditModal(marker);
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          {tDefault('common.actions.edit', 'Edit')}
        </Button>
      ),
    },
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void vm.submitDietaryMarker();
  }

  if (vm.isLoading && vm.dietaryMarkers.length === 0) {
    return (
      <LoadingState
        label={tDefault(
          'admin.dietaryMarkers.loading',
          'Loading dietary markers',
        )}
      />
    );
  }

  return (
    <section className="admin-page-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.08em] text-primary uppercase">
            {tDefault('admin.eyebrow', 'Super admin')}
          </p>
          <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
            {tDefault('admin.dietaryMarkers.title', 'Dietary markers')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'admin.dietaryMarkers.description',
              'Manage global dietary and regulatory metadata.',
            )}
          </p>
        </div>
        <Button onClick={vm.openCreateModal} type="button">
          {tDefault('admin.dietaryMarkers.create', 'Create dietary marker')}
        </Button>
      </div>

      {vm.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        data={vm.dietaryMarkers}
        isLoading={vm.isLoading}
        labels={{
          empty: tDefault(
            'admin.dietaryMarkers.empty',
            'No dietary markers found.',
          ),
        }}
        rowKey={(marker) => marker.id}
        toolbar={
          <FilterSelect
            onChange={vm.setFilter}
            options={getMetadataVisibilityOptions(tDefault)}
            value={vm.filter}
          />
        }
      />

      <Modal
        description={tDefault(
          'admin.metadata.keyLockedDescription',
          'The key is create-only and cannot be changed after creation.',
        )}
        footer={
          <>
            <Button onClick={vm.closeModal} type="button" variant="ghost">
              {tDefault('common.actions.cancel', 'Cancel')}
            </Button>
            <Button
              disabled={vm.form.isSubmitting}
              form="dietary-marker-form"
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
        <form
          className="grid gap-4"
          id="dietary-marker-form"
          onSubmit={handleSubmit}
        >
          {vm.form.submitError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {vm.form.submitError}
            </p>
          ) : null}
          <Field
            description={tDefault(
              'admin.metadata.keyDescription',
              'Lowercase letters, numbers, hyphens, or underscores.',
            )}
            error={vm.form.fieldErrors.key}
            label={tDefault('admin.metadata.key', 'Key')}
            required
          >
            <Input
              disabled={!vm.isCreateMode}
              value={vm.form.values.key}
              onChange={(event) => {
                vm.form.setField('key', event.target.value);
              }}
            />
          </Field>
          <Field
            error={vm.form.fieldErrors.name}
            label={tDefault('admin.metadata.name', 'Name')}
            required
            renderControl={
              <LocalizedStringInput
                defaultLocale="zh-TW"
                disabled={vm.form.isSubmitting}
                onChange={(v) => vm.form.setField('name', v)}
                value={vm.form.values.name}
              />
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              error={vm.form.fieldErrors.icon}
              label={tDefault('admin.metadata.icon', 'Icon')}
            >
              <Input
                value={vm.form.values.icon}
                onChange={(event) => {
                  vm.form.setField('icon', event.target.value);
                }}
              />
            </Field>
            <Field
              error={vm.form.fieldErrors.type}
              label={tDefault('admin.dietaryMarkers.type', 'Type')}
              required
            >
              <select
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
                value={vm.form.values.type}
                onChange={(event) => {
                  vm.form.setField(
                    'type',
                    event.target.value as DietaryMarkerType,
                  );
                }}
              >
                {dietaryMarkerTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              checked={vm.form.values.isActive}
              className="h-4 w-4"
              onChange={(event) => {
                vm.form.setField('isActive', event.target.checked);
              }}
              type="checkbox"
            />
            {tDefault('admin.metadata.isActive', 'Active')}
          </label>
        </form>
      </Modal>
    </section>
  );
}
