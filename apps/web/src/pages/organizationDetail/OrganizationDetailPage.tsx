import { Link, useParams } from 'react-router';
import { ChevronLeft, PenSquare } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { OrganizationForm } from '@/features/organization/components/organizationForm/OrganizationForm';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';
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

  if (!vm.organization) {
    return (
      <section className="grid gap-8 p-8">
        <Link
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
          to="/admin/organizations"
        >
          <ChevronLeft className="h-4 w-4" />
          {tDefault('admin.organizations.backToList', 'Back to organizations')}
        </Link>
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.error ||
            tDefault('admin.organizations.notFound', 'Organization not found.')}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="grid gap-8 p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
              to="/admin/organizations"
            >
              <ChevronLeft className="h-4 w-4" />
              {tDefault(
                'admin.organizations.backToList',
                'Back to organizations',
              )}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              {vm.organization.name}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {vm.organization.domain}
            </p>
          </div>
          <Button onClick={vm.openEditModal}>
            <PenSquare className="mr-2 h-4 w-4" />
            {tDefault('common.actions.edit', 'Edit')}
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column (Details) */}
          <div className="col-span-2 grid content-start gap-8">
            {/* Details Card */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border p-4">
                <h3 className="font-semibold">
                  {tDefault(
                    'admin.organizations.detailTitle',
                    'Organization Details',
                  )}
                </h3>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-6 text-sm">
                <div className="col-span-1">
                  <dt className="font-medium text-muted-foreground">
                    {tDefault('admin.organizations.name', 'Name')}
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {vm.organization.name}
                  </dd>
                </div>
                <div className="col-span-1">
                  <dt className="font-medium text-muted-foreground">
                    {tDefault('admin.organizations.domain', 'Domain')}
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {vm.organization.domain || 'N/A'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-medium text-muted-foreground">
                    {tDefault('admin.organizations.id', 'Organization ID')}
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-muted-foreground">
                    {vm.organization.id}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Contact Card */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border p-4">
                <h3 className="font-semibold">
                  {tDefault('admin.organizations.contactTitle', 'Contact')}
                </h3>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-6 text-sm">
                <div className="col-span-1">
                  <dt className="font-medium text-muted-foreground">
                    {tDefault('admin.organizations.contactEmail', 'Email')}
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {vm.organization.contactEmail || 'N/A'}
                  </dd>
                </div>
                <div className="col-span-1">
                  <dt className="font-medium text-muted-foreground">
                    {tDefault('admin.organizations.contactPhone', 'Phone')}
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {vm.displayContactPhone || 'N/A'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-medium text-muted-foreground">
                    {tDefault('admin.organizations.address', 'Address')}
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {vm.formattedAddress || 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Right Column (Status & Meta) */}
          <div className="col-span-1">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-semibold">
                {tDefault('admin.organizations.statusTitle', 'Status')}
              </h3>
              <div className="mt-4 flex items-center gap-2">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    vm.organization.status === 'active'
                      ? 'bg-emerald-500'
                      : 'bg-rose-500',
                  )}
                />
                <span className="text-sm font-semibold capitalize text-foreground">
                  {vm.organization.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {tDefault(
                  'admin.organizations.statusReview',
                  'Review status: {{status}}',
                  { status: vm.organization.reviewStatus },
                )}
              </p>
              <div className="mt-6 space-y-4 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    {tDefault('common.fields.createdAt', 'Created at')}
                  </span>
                  <span className="font-mono">
                    {new Date(vm.organization.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    {tDefault('common.fields.updatedAt', 'Last updated')}
                  </span>
                  <span className="font-mono">
                    {new Date(vm.organization.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
    </>
  );
}
