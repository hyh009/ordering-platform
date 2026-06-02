import type { FormEvent } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { LocalizedNameFields } from '@/features/metadata/components/LocalizedNameFields';
import { getLocalizedText } from '@/models/metadata';
import type { MetadataActiveFilter } from '@/models/metadata';
import { Field } from '@/shared/components/form/Field';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useAllergenListPageVM } from './useAllergenListPageVM';

const activeFilterOptions: MetadataActiveFilter[] = ['true', 'false', 'all'];

export function AllergenListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useAllergenListPageVM();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void vm.submitAllergen();
  }

  if (vm.isLoading && vm.allergens.length === 0) {
    return (
      <LoadingState
        label={tDefault('admin.allergens.loading', 'Loading allergens')}
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
            {tDefault('admin.allergens.title', 'Allergens')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'admin.allergens.description',
              'Manage global allergen metadata used across organizations.',
            )}
          </p>
        </div>
        <Button onClick={vm.openCreateModal} type="button">
          {tDefault('admin.allergens.create', 'Create allergen')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium" htmlFor="allergen-filter">
          {tDefault('admin.metadata.activeFilter', 'Visibility')}
        </label>
        <select
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
          id="allergen-filter"
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
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,12rem)_6rem_8rem] gap-3 border-b border-border px-4 py-3 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
          <span>{tDefault('admin.metadata.name', 'Name')}</span>
          <span>{tDefault('admin.metadata.key', 'Key')}</span>
          <span>{tDefault('admin.metadata.status', 'Status')}</span>
          <span className="text-right">
            {tDefault('common.table.actions', 'Actions')}
          </span>
        </div>
        {vm.allergens.map((allergen) => (
          <article
            className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,12rem)_6rem_8rem] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            key={allergen.id}
          >
            <div className="min-w-0">
              <p className="m-0 truncate font-semibold">
                {getLocalizedText(allergen.name)}
              </p>
              {allergen.icon ? (
                <p className="m-0 text-sm text-muted-foreground">
                  {allergen.icon}
                </p>
              ) : null}
            </div>
            <code className="truncate text-sm text-muted-foreground">
              {allergen.key}
            </code>
            <span className="text-sm text-muted-foreground">
              {allergen.isActive
                ? tDefault('admin.metadata.active', 'Active')
                : tDefault('admin.metadata.inactive', 'Inactive')}
            </span>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  vm.openEditModal(allergen);
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

      {vm.allergens.length === 0 && !vm.isLoading ? (
        <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {tDefault('admin.allergens.empty', 'No allergens found.')}
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
              form="allergen-form"
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
        <form className="grid gap-4" id="allergen-form" onSubmit={handleSubmit}>
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
