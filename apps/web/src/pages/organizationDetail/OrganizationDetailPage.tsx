import { Link, useParams } from 'react-router';
import { useAppTranslation } from '@/app/i18n';
import { OrganizationForm } from '@/features/organization/components/organizationForm/OrganizationForm';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/button';
import { useOrganizationDetailPageVM } from './useOrganizationDetailPageVM';

export function OrganizationDetailPage() {
  const params = useParams();
  const organizationId = params.organizationId ?? '';
  const { tDefault } = useAppTranslation();
  const vm = useOrganizationDetailPageVM(organizationId);

  if (vm.isLoading && !vm.organization) {
    return (
      <LoadingState
        label={tDefault(
          'admin.organizations.detailLoading',
          'Loading organization',
        )}
      />
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-8 md:px-8">
      <Link
        className="text-sm font-semibold text-muted-foreground hover:text-primary"
        to="/admin/organizations"
      >
        {tDefault('admin.organizations.backToList', 'Back to organizations')}
      </Link>

      {vm.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.error}
        </p>
      ) : null}

      {vm.organization ? (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold tracking-[0.08em] text-primary uppercase">
                {tDefault('admin.organizations.detailEyebrow', 'Organization')}
              </p>
              <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
                {vm.organization.name}
              </h1>
              <p className="text-base text-muted-foreground">
                {tDefault(
                  'admin.organizations.detailDescription',
                  'Core organization fields. Memberships will be managed in a later view.',
                )}
              </p>
            </div>
            <Button onClick={vm.openEditModal} type="button">
              {tDefault('common.actions.edit', 'Edit')}
            </Button>
          </div>

          <dl className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {tDefault('admin.organizations.id', 'Organization ID')}
              </dt>
              <dd className="mt-1 break-all text-sm font-semibold">
                {vm.organization.id}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {tDefault('admin.organizations.status', 'Status')}
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {vm.organization.status}
              </dd>
            </div>
          </dl>
        </>
      ) : null}

      <Modal
        description={tDefault(
          'admin.organizations.modalDescription',
          'Key organization fields only. Membership management will be handled separately.',
        )}
        isOpen={vm.isEditModalOpen}
        onClose={vm.closeEditModal}
        title={tDefault('admin.organizations.editTitle', 'Edit organization')}
      >
        <OrganizationForm
          form={vm.form}
          onCancel={vm.closeEditModal}
          onSubmit={vm.submitOrganization}
          showStatus
        />
      </Modal>
    </section>
  );
}
