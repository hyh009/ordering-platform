import { Link, useParams } from 'react-router';
import { ChevronLeft, Pencil } from 'lucide-react';
import { organizationMembershipRoles } from '@repo/shared';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { AddMemberForm } from '@/features/organization/membership/components/addMemberForm/AddMemberForm';
import { Field } from '@/shared/components/form/Field';
import { OptionsSelect } from '@/shared/components/form/OptionsSelect';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';
import type { OrganizationMembership, OrganizationMembershipRole } from '@/models/organizationMembership';
import { useOrganizationMembershipsPageVM } from './useOrganizationMembershipsPageVM';

const ROLE_LABELS: Record<OrganizationMembershipRole, string> = {
  org_owner: 'Org Owner',
  org_admin: 'Org Admin',
  staff: 'Staff',
};

const ROLE_OPTIONS = organizationMembershipRoles.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

function MemberAvatar({ email }: { email: string }) {
  const initial = (email[0] ?? '?').toUpperCase();
  const colors = [
    'bg-violet-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
  ];
  const color = colors[email.charCodeAt(0) % colors.length];

  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
        color,
      )}
    >
      {initial}
    </span>
  );
}

function RoleBadge({ role }: { role: OrganizationMembership['role'] }) {
  const badgeClass =
    role === 'org_owner'
      ? 'bg-violet-100 text-violet-700'
      : role === 'org_admin'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-muted text-muted-foreground';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        badgeClass,
      )}
    >
      {role}
    </span>
  );
}

function StatusDot({ status }: { status: OrganizationMembership['status'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          status === 'active' ? 'bg-emerald-500' : 'bg-rose-500',
        )}
      />
      <span className="capitalize text-foreground">{status}</span>
    </span>
  );
}

export function OrganizationMembershipsPage() {
  const params = useParams();
  const organizationId = params.organizationId ?? '';
  const { tDefault } = useAppTranslation();
  const vm = useOrganizationMembershipsPageVM(organizationId);

  if (vm.isLoading && vm.memberships.length === 0) {
    return (
      <LoadingState
        label={tDefault('admin.memberships.loading', 'Loading members')}
      />
    );
  }

  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-8 md:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
              to={PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organizationId)}
            >
              <ChevronLeft className="h-4 w-4" />
              {tDefault('admin.memberships.backToDetail', 'Back to organization')}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              {tDefault('admin.memberships.title', 'Members')}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {tDefault(
                'admin.memberships.description',
                'Manage organization membership and roles.',
              )}
            </p>
          </div>
          <Button onClick={vm.openAddModal} type="button">
            {tDefault('admin.memberships.addMember', 'Add member')}
          </Button>
        </div>

        {vm.error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {vm.error}
          </p>
        ) : null}

        {/* Membership table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="pl-4">
                  {tDefault('admin.memberships.member', 'Member')}
                </TableHead>
                <TableHead>{tDefault('admin.memberships.role', 'Role')}</TableHead>
                <TableHead>{tDefault('admin.memberships.status', 'Status')}</TableHead>
                <TableHead>{tDefault('common.fields.createdAt', 'Created at')}</TableHead>
                <TableHead className="pr-4 text-right">
                  {tDefault('common.table.actions', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vm.memberships.map((membership) => (
                <TableRow key={membership.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <MemberAvatar email={membership.userEmail} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {membership.userUsername}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {membership.userEmail}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={membership.role} />
                  </TableCell>
                  <TableCell>
                    <StatusDot status={membership.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(membership.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button
                      onClick={() => vm.openEditModal(membership)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">
                        {tDefault('common.actions.edit', 'Edit')}
                      </span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {vm.memberships.length === 0 && !vm.isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {tDefault('admin.memberships.empty', 'No members yet.')}
            </p>
          ) : null}
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {tDefault('common.pagination.summary', 'Page {{page}} of {{total}}', {
              page: vm.page,
              total: vm.totalPages,
            })}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={!vm.hasPreviousPage || vm.isLoading}
              onClick={() => void vm.previousPage()}
              type="button"
              variant="secondary"
            >
              {tDefault('common.actions.previous', 'Previous')}
            </Button>
            <Button
              disabled={!vm.hasNextPage || vm.isLoading}
              onClick={() => void vm.nextPage()}
              type="button"
              variant="secondary"
            >
              {tDefault('common.actions.next', 'Next')}
            </Button>
          </div>
        </div>
      </section>

      {/* Add member modal */}
      <Modal
        description={tDefault(
          'admin.memberships.addModalDescription',
          'Create a new user and assign them a role in this organization.',
        )}
        footer={
          <>
            <Button onClick={vm.closeAddModal} type="button" variant="ghost">
              {tDefault('common.actions.cancel', 'Cancel')}
            </Button>
            <Button
              disabled={vm.addForm.isSubmitting}
              form="add-member-form"
              type="submit"
            >
              {vm.addForm.isSubmitting
                ? tDefault('common.actions.saving', 'Saving...')
                : tDefault('admin.memberships.addMember', 'Add member')}
            </Button>
          </>
        }
        isOpen={vm.isAddModalOpen}
        onClose={vm.closeAddModal}
        title={tDefault('admin.memberships.addTitle', 'Add member')}
      >
        <AddMemberForm
          form={vm.addForm}
          hideFooter
          id="add-member-form"
          onCancel={vm.closeAddModal}
          onSubmit={vm.submitAdd}
        />
      </Modal>

      {/* Edit membership modal */}
      {vm.editTarget ? (
        <Modal
          description={tDefault(
            'admin.memberships.editModalDescription',
            'Change the role or disable this membership.',
          )}
          footer={
            <div className="flex w-full items-center justify-between">
              {vm.editTarget.status === 'active' ? (
                <Button
                  disabled={vm.editForm.isSubmitting}
                  onClick={() => void vm.submitDisable()}
                  type="button"
                  variant="destructive"
                >
                  {tDefault('admin.memberships.disable', 'Disable')}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button onClick={vm.closeEditModal} type="button" variant="ghost">
                  {tDefault('common.actions.cancel', 'Cancel')}
                </Button>
                <Button
                  disabled={vm.editForm.isSubmitting}
                  onClick={() => void vm.submitEdit()}
                  type="button"
                >
                  {vm.editForm.isSubmitting
                    ? tDefault('common.actions.saving', 'Saving...')
                    : tDefault('common.actions.save', 'Save')}
                </Button>
              </div>
            </div>
          }
          isOpen={!!vm.editTarget}
          onClose={vm.closeEditModal}
          title={tDefault('admin.memberships.editTitle', 'Edit membership')}
        >
          <div className="grid gap-4">
            {vm.editForm.submitError ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {vm.editForm.submitError}
              </p>
            ) : null}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <MemberAvatar email={vm.editTarget.userEmail} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{vm.editTarget.userUsername}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {vm.editTarget.userEmail}
                </p>
              </div>
            </div>
            <Field label={tDefault('admin.memberships.role', 'Role')} required>
              <OptionsSelect
                onValueChange={(v) =>
                  vm.setEditRole(v as OrganizationMembershipRole)
                }
                options={ROLE_OPTIONS}
                value={vm.editForm.role}
              />
            </Field>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
