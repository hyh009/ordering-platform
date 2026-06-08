import { Link } from 'react-router';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { OrganizationForm } from '@/features/components/organization/organizationForm/OrganizationForm';
import { ReviewStatusBadge } from '@/features/admin/organization/components/ReviewStatusBadge';
import type {
  OrganizationReviewStatusFilter,
  OrganizationStatusFilter,
} from '@/features/admin/organization/list/store';
import {
  getOrganizationReviewStatusLabel,
  getOrganizationStatusLabel,
  type OrganizationListItem,
} from '@/models/organization';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { FilterSelect } from '@/shared/components/form/FilterSelect';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/button';
import { useOrganizationListPageVM } from './useOrganizationListPageVM';

export function OrganizationListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useOrganizationListPageVM();

  const statusOptions: { label: string; value: OrganizationStatusFilter }[] = [
    {
      label: tDefault('admin.organizations.statusFilter.all', 'All statuses'),
      value: 'all',
    },
    {
      label: getOrganizationStatusLabel('active', tDefault),
      value: 'active',
    },
    {
      label: getOrganizationStatusLabel('disabled', tDefault),
      value: 'disabled',
    },
  ];

  const reviewStatusOptions: {
    label: string;
    value: OrganizationReviewStatusFilter;
  }[] = [
    {
      label: tDefault('admin.organizations.reviewFilter.all', 'All reviews'),
      value: 'all',
    },
    {
      label: getOrganizationReviewStatusLabel('pending', tDefault),
      value: 'pending',
    },
    {
      label: getOrganizationReviewStatusLabel('approved', tDefault),
      value: 'approved',
    },
    {
      label: getOrganizationReviewStatusLabel('rejected', tDefault),
      value: 'rejected',
    },
  ];

  const columns: DataTableColumn<OrganizationListItem>[] = [
    {
      key: 'name',
      header: tDefault('admin.organizations.name', 'Name'),
      sortable: true,
      className: 'pl-4',
      render: (organization) => (
        <Link
          className="font-semibold hover:text-primary"
          to={PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organization.id)}
        >
          {organization.name}
        </Link>
      ),
    },
    {
      key: 'status',
      header: tDefault('admin.organizations.status', 'Status'),
      cellClassName: 'text-muted-foreground',
      render: (organization) =>
        getOrganizationStatusLabel(organization.status, tDefault),
    },
    {
      key: 'reviewStatus',
      header: tDefault('admin.organizations.reviewStatusLabel', 'Review'),
      render: (organization) => (
        <ReviewStatusBadge status={organization.reviewStatus} />
      ),
    },
    {
      key: 'updatedAt',
      header: tDefault('common.fields.updatedAt', 'Updated'),
      sortable: true,
      cellClassName: 'text-sm text-muted-foreground',
      render: (organization) =>
        new Date(organization.updatedAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: tDefault('common.table.actions', 'Actions'),
      align: 'right',
      className: 'pr-4',
      render: (organization) => (
        <Button size="sm" variant="secondary">
          <Link
            to={PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organization.id)}
          >
            {tDefault('common.actions.view', 'View')}
          </Link>
        </Button>
      ),
    },
  ];

  if (vm.isLoading && vm.organizations.length === 0) {
    return (
      <LoadingState
        label={tDefault('admin.organizations.loading', 'Loading organizations')}
      />
    );
  }

  return (
    <>
      <section className="admin-page-content">
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

        <DataTable
          columns={columns}
          data={vm.organizations}
          isLoading={vm.isLoading}
          labels={{
            search: tDefault(
              'admin.organizations.searchPlaceholder',
              'Search organizations',
            ),
            empty: tDefault(
              'admin.organizations.empty',
              'No organizations have been created yet.',
            ),
          }}
          limit={vm.pagination.limit}
          limitOptions={[10, 20, 50]}
          onLimitChange={(limit) => void vm.changeLimit(limit)}
          onSearchChange={vm.setKeyword}
          onSortChange={vm.setSort}
          pagination={{
            type: 'offset',
            page: vm.page,
            totalPages: vm.totalPages,
            onPageChange: (page) => void vm.goToPage(page),
          }}
          rowKey={(organization) => organization.id}
          search={vm.keyword}
          sort={{ key: vm.sort.sortBy, direction: vm.sort.sortDirection }}
          toolbar={
            <>
              <FilterSelect
                onChange={vm.setStatusFilter}
                options={statusOptions}
                value={vm.statusFilter}
              />
              <FilterSelect
                onChange={vm.setFilter}
                options={reviewStatusOptions}
                value={vm.reviewStatusFilter}
              />
            </>
          }
        />
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
