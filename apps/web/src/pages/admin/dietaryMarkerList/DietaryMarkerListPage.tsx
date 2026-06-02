import type { FormEvent } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { LocalizedNameFields } from '@/features/metadata/components/LocalizedNameFields';
import { dietaryMarkerTypes, getLocalizedText } from '@/models/metadata';
import type {
  DietaryMarkerType,
  MetadataActiveFilter,
} from '@/models/metadata';
import { Field } from '@/shared/components/form/Field';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useDietaryMarkerListPageVM } from './useDietaryMarkerListPageVM';

const activeFilterOptions: MetadataActiveFilter[] = ['true', 'false', 'all'];

export function DietaryMarkerListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useDietaryMarkerListPageVM();

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

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium" htmlFor="dietary-filter">
          {tDefault('admin.metadata.activeFilter', 'Visibility')}
        </label>
        <select
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
          id="dietary-filter"
          value={vm.filter}
          onChange={(event) => {
            vm.setFilter(event.target.value as MetadataActiveFilter);
          }}
        >
          {activeFilterOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'true'
                ? tDefault('admin.metadata.activeOnly', 'Active')
                : option === 'false'
                  ? tDefault('admin.metadata.inactiveOnly', 'Inactive')
                  : tDefault('admin.metadata.all', 'All')}
            </option>
          ))}
        </select>
      </div>

      {vm.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,12rem)_7rem_6rem_8rem] gap-3 border-b border-border px-4 py-3 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
          <span>{tDefault('admin.metadata.name', 'Name')}</span>
          <span>{tDefault('admin.metadata.key', 'Key')}</span>
          <span>{tDefault('admin.dietaryMarkers.type', 'Type')}</span>
          <span>{tDefault('admin.metadata.status', 'Status')}</span>
          <span className="text-right">
            {tDefault('common.table.actions', 'Actions')}
          </span>
        </div>
        {vm.dietaryMarkers.map((marker) => (
          <article
            className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,12rem)_7rem_6rem_8rem] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            key={marker.id}
          >
            <div className="min-w-0">
              <p className="m-0 truncate font-semibold">
                {getLocalizedText(marker.name)}
              </p>
              {marker.icon ? (
                <p className="m-0 text-sm text-muted-foreground">
                  {marker.icon}
                </p>
              ) : null}
            </div>
            <code className="truncate text-sm text-muted-foreground">
              {marker.key}
            </code>
            <span className="text-sm text-muted-foreground">{marker.type}</span>
            <span className="text-sm text-muted-foreground">
              {marker.isActive
                ? tDefault('admin.metadata.active', 'Active')
                : tDefault('admin.metadata.inactive', 'Inactive')}
            </span>
            <div className="flex justify-end">
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
            </div>
          </article>
        ))}
      </div>

      {vm.dietaryMarkers.length === 0 && !vm.isLoading ? (
        <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {tDefault('admin.dietaryMarkers.empty', 'No dietary markers found.')}
        </p>
      ) : null}

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
          <LocalizedNameFields
            errors={{
              en: vm.form.fieldErrors.en,
              zhTw: vm.form.fieldErrors.zhTw,
            }}
            values={{
              en: vm.form.values.en,
              zhTw: vm.form.values.zhTw,
            }}
            onFieldChange={(field, value) => {
              vm.form.setField(field, value);
            }}
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
