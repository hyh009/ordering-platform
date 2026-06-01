import { Link } from 'react-router';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { OrganizationForm } from '@/features/organization/components/organizationForm/OrganizationForm';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/button';
import { useOrganizationListPageVM } from './useOrganizationListPageVM';

export function OrganizationListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useOrganizationListPageVM();

  if (vm.isLoading && vm.organizations.length === 0) {
    return (
      <LoadingState
        label={tDefault('admin.organizations.loading', 'Loading organizations')}
      />
    );
  }

  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-8 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mb-3 text-3xl font-bold leading-tight md:text-4xl">
              {tDefault('admin.organizations.title', 'Organizations')}
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              {tDefault(
                'admin.organizations.description.list',
                'View and manage organizations.',
              )}
            </p>
          </div>
          <Button onClick={vm.openCreateModal} type="button">
            {tDefault('admin.organizations.create', 'Create organization')}
          </Button>
        </div>

        {vm.error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {vm.error}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="grid grid-cols-[minmax(0,1fr)_8rem_9rem] gap-3 border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <span>{tDefault('admin.organizations.name', 'Name')}</span>
            <span>{tDefault('admin.organizations.status', 'Status')}</span>
            <span className="text-right">
              {tDefault('common.table.actions', 'Actions')}
            </span>
          </div>
          {vm.organizations.map((organization) => (
            <article
              className="grid grid-cols-[minmax(0,1fr)_8rem_9rem] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              key={organization.id}
            >
              <Link
                className="min-w-0 truncate font-semibold hover:text-primary"
                to={PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(
                  organization.id,
                )}
              >
                {organization.name}
              </Link>
              <span className="text-sm capitalize text-muted-foreground">
                {organization.reviewStatus === 'pending'
                  ? organization.reviewStatus
                  : organization.status}
              </span>
              <div className="flex justify-end">
                <Button size="sm" variant="secondary">
                  <Link
                    to={PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(
                      organization.id,
                    )}
                  >
                    {tDefault('common.actions.view', 'View')}
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>

        {vm.organizations.length === 0 && !vm.isLoading ? (
          <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {tDefault(
              'admin.organizations.empty',
              'No organizations have been created yet.',
            )}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {tDefault(
              'common.pagination.summary',
              'Page {{page}} of {{total}}',
              {
                page: vm.page,
                total: vm.totalPages,
              },
            )}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={!vm.hasPreviousPage || vm.isLoading}
              onClick={() => {
                void vm.previousPage();
              }}
              type="button"
              variant="secondary"
            >
              {tDefault('common.actions.previous', 'Previous')}
            </Button>
            <Button
              disabled={!vm.hasNextPage || vm.isLoading}
              onClick={() => {
                void vm.nextPage();
              }}
              type="button"
              variant="secondary"
            >
              {tDefault('common.actions.next', 'Next')}
            </Button>
          </div>
        </div>
      </section>

      <Modal
        description={tDefault(
          'admin.organizations.createModalDescription',
          'Create a new organization and assign an owner.',
        )}
        footer={
          <>
            <Button onClick={vm.closeCreateModal} type="button" variant="ghost">
              {tDefault('common.actions.cancel', 'Cancel')}
            </Button>
            <Button
              disabled={vm.form.isSubmitting}
              form="create-organization-form"
              type="submit"
            >
              {vm.form.isSubmitting
                ? tDefault('common.actions.saving', 'Saving...')
                : tDefault('common.actions.save', 'Save')}
            </Button>
          </>
        }
        isOpen={vm.isCreateModalOpen}
        onClose={vm.closeCreateModal}
        size="lg"
        title={tDefault(
          'admin.organizations.createTitle',
          'Create organization',
        )}
      >
        <OrganizationForm
          form={vm.form}
          hideFooter
          id="create-organization-form"
          onCancel={vm.closeCreateModal}
          onSubmit={vm.submitCreate}
          showOwnerUserId
        />
      </Modal>
    </>
  );
}
