import { Link, useParams } from 'react-router';
import {
  PenSquare,
  Store,
  Users,
  ChevronRight,
  Ban,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { OrganizationForm } from '@/features/components/organization/organizationForm/OrganizationForm';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';
import { useOrganizationDetailPageVM } from './useOrganizationDetailPageVM';
import type { OrganizationMembership } from '@/models/organizationMembership';

function OrgAvatar({ name }: { name: string }) {
  const initial = (name[0] ?? '?').toUpperCase();
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
      {initial}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        isActive
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-rose-100 text-rose-700',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isActive ? 'bg-emerald-500' : 'bg-rose-500',
        )}
      />
      {status}
    </span>
  );
}

function ReviewBadge({ reviewStatus }: { reviewStatus: string }) {
  const isApproved = reviewStatus === 'approved';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        isApproved
          ? 'bg-blue-100 text-blue-700'
          : 'bg-amber-100 text-amber-700',
      )}
    >
      Review: {reviewStatus}
    </span>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-3.5">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DescriptionList({
  rows,
}: {
  rows: { label: string; value: React.ReactNode; span?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
      {rows.map(({ label, value, span }) => (
        <div key={label} className={span ? 'col-span-2' : ''}>
          <dt className="font-medium text-muted-foreground">{label}</dt>
          <dd className="mt-1 font-medium text-foreground">{value ?? 'N/A'}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  state,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  href: string;
  state?: Record<string, unknown>;
}) {
  return (
    <Link
      className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition-colors hover:bg-muted/50"
      to={href}
      state={state}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
  state,
  destructive,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  state?: Record<string, unknown>;
  destructive?: boolean;
}) {
  return (
    <Link
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted',
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground',
      )}
      to={href}
      state={state}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          destructive ? 'text-destructive' : 'text-muted-foreground',
        )}
      />
      <span className="flex-1">{label}</span>
      <ChevronRight
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          destructive ? 'text-destructive/60' : 'text-muted-foreground/60',
        )}
      />
    </Link>
  );
}

function OwnerRow({
  owner,
  ownerLoading,
}: {
  owner: OrganizationMembership | null;
  ownerLoading: boolean;
}) {
  if (ownerLoading) {
    return <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>;
  }
  if (!owner) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">No owner found.</p>
    );
  }
  const initial = (owner.userEmail[0] ?? '?').toUpperCase();
  const colors = [
    'bg-violet-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
  ];
  const colorIndex =
    owner.userEmail.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    colors.length;
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
          colors[colorIndex],
        )}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{owner.userUsername}</p>
        <p className="truncate text-xs text-muted-foreground">
          {owner.userEmail}
        </p>
      </div>
      <span className="ml-auto shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
        Owner
      </span>
    </div>
  );
}

export function OrganizationDetailPage() {
  const params = useParams();
  const organizationId = params.organizationId ?? '';
  const { tDefault } = useAppTranslation();
  const vm = useOrganizationDetailPageVM(organizationId);

  const breadcrumbItems = [
    {
      label: tDefault('admin.organizations.title', 'Organizations'),
      href: PATHS.SUPER_ADMIN.ORGANIZATIONS,
    },
    { label: vm.organization?.name ?? '…' },
  ];

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
      <section className="admin-page-content">
        <Breadcrumb items={breadcrumbItems} />
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.error ||
            tDefault('admin.organizations.notFound', 'Organization not found.')}
        </p>
      </section>
    );
  }

  const org = vm.organization;
  const orgName = org.name;

  return (
    <>
      <section className="admin-page-content">
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <OrgAvatar name={orgName} />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{orgName}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{org.slug}</p>
              <div className="mt-2 flex gap-2">
                <StatusBadge status={org.status} />
                <ReviewBadge reviewStatus={org.reviewStatus} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {org.reviewStatus === 'pending' ? (
              <>
                <Button
                  onClick={() => void vm.reviewOrganization('approved')}
                  variant="outline"
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                  {tDefault('admin.organizations.approveAction', 'Approve')}
                </Button>
                <Button
                  onClick={() => void vm.reviewOrganization('rejected')}
                  variant="outline"
                >
                  <XCircle className="mr-2 h-4 w-4 text-rose-600" />
                  {tDefault('admin.organizations.rejectAction', 'Reject')}
                </Button>
              </>
            ) : null}
            <Button onClick={vm.openEditModal} variant="outline">
              <PenSquare className="mr-2 h-4 w-4" />
              {tDefault('common.actions.edit', 'Edit')}
            </Button>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left 2/3 */}
          <div className="col-span-2 grid content-start gap-6">
            <InfoCard
              title={tDefault(
                'admin.organizations.overviewTitle',
                'Organization details',
              )}
            >
              <DescriptionList
                rows={[
                  {
                    label: tDefault('admin.organizations.name', 'Name'),
                    value: org.name,
                  },
                  {
                    label: tDefault('admin.organizations.slug', 'Domain'),
                    value: org.slug || 'N/A',
                  },
                  {
                    label: tDefault('admin.organizations.status', 'Status'),
                    value: <StatusBadge status={org.status} />,
                  },
                  {
                    label: tDefault(
                      'admin.organizations.reviewStatus',
                      'Review Status',
                    ),
                    value: <ReviewBadge reviewStatus={org.reviewStatus} />,
                  },
                ]}
              />
            </InfoCard>

            <InfoCard
              title={tDefault(
                'admin.organizations.contactTitle',
                'Contact information',
              )}
            >
              <DescriptionList
                rows={[
                  {
                    label: tDefault(
                      'admin.organizations.contactEmail',
                      'Contact Email',
                    ),
                    value: org.contactEmail || 'N/A',
                  },
                  {
                    label: tDefault(
                      'admin.organizations.contactPhone',
                      'Contact Phone',
                    ),
                    value: vm.displayContactPhone || 'N/A',
                  },
                ]}
              />
            </InfoCard>

            <InfoCard
              title={tDefault('admin.organizations.addressTitle', 'Address')}
            >
              <DescriptionList
                rows={[
                  {
                    label: tDefault('admin.organizations.addressCity', 'City'),
                    value: org.address?.tw.city || 'N/A',
                  },
                  {
                    label: tDefault(
                      'admin.organizations.addressDistrict',
                      'District',
                    ),
                    value: org.address?.tw.district || 'N/A',
                  },
                  {
                    label: tDefault(
                      'admin.organizations.addressPostalCode',
                      'Postal Code',
                    ),
                    value: org.address?.tw.postalCode || 'N/A',
                  },
                  {
                    label: tDefault(
                      'admin.organizations.streetAddress',
                      'Address Line 1',
                    ),
                    value: org.address?.tw.streetAddress || 'N/A',
                    span: true,
                  },
                ]}
              />
            </InfoCard>

            <InfoCard
              title={tDefault('admin.organizations.metadataTitle', 'Metadata')}
            >
              <DescriptionList
                rows={[
                  {
                    label: tDefault(
                      'admin.organizations.id',
                      'Organization ID',
                    ),
                    value: (
                      <span className="break-all font-mono text-xs text-muted-foreground">
                        {org.id}
                      </span>
                    ),
                    span: true,
                  },
                  {
                    label: tDefault('common.fields.createdAt', 'Created at'),
                    value: new Date(org.createdAt).toLocaleDateString(),
                  },
                  {
                    label: tDefault('common.fields.updatedAt', 'Last updated'),
                    value: new Date(org.updatedAt).toLocaleDateString(),
                  },
                ]}
              />
            </InfoCard>
          </div>

          {/* Right 1/3 */}
          <div className="col-span-1 grid content-start gap-6">
            {/* Stats row */}
            <div className="flex gap-3">
              <StatCard
                href={PATHS.SUPER_ADMIN.ORGANIZATION_MEMBERSHIPS_BUILD(
                  organizationId,
                )}
                icon={Users}
                label={tDefault('admin.organizations.membersLabel', '位成員')}
                state={{ organizationName: orgName }}
                value={vm.ownerLoading ? '…' : '1+'}
              />
              <StatCard
                href={PATHS.SUPER_ADMIN.STORE_LIST_BUILD(organizationId)}
                icon={Store}
                label={tDefault('admin.organizations.storesLabel', '間門市')}
                state={{ organizationName: orgName }}
                value={vm.storesLoading ? '…' : vm.stores.length}
              />
            </div>

            {/* Owner row (compact) */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-3.5">
                <h3 className="text-sm font-semibold">
                  {tDefault('admin.organizations.ownerTitle', 'Owner')}
                </h3>
              </div>
              <OwnerRow owner={vm.owner} ownerLoading={vm.ownerLoading} />
            </div>

            {/* Stores list (compact) */}
            {!vm.storesLoading && vm.stores.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-3.5">
                  <h3 className="text-sm font-semibold">
                    {tDefault('admin.organizations.storesTitle', 'Stores')}
                  </h3>
                </div>
                <ul className="divide-y divide-border">
                  {vm.stores.map((store) => (
                    <li
                      key={store.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {store.profile.displayName['zh-TW'] ??
                          store.profile.displayName.en ??
                          store.id}
                      </span>
                      <StatusBadge status={store.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick actions */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-3.5">
                <h3 className="text-sm font-semibold">
                  {tDefault(
                    'admin.organizations.quickActionsTitle',
                    '快速操作',
                  )}
                </h3>
              </div>
              <div className="p-2">
                <QuickAction
                  href={PATHS.SUPER_ADMIN.ORGANIZATION_MEMBERSHIPS_BUILD(
                    organizationId,
                  )}
                  icon={Users}
                  label={tDefault(
                    'admin.memberships.manageMembers',
                    '管理成員',
                  )}
                  state={{ organizationName: orgName }}
                />
                <QuickAction
                  href={PATHS.SUPER_ADMIN.STORE_CREATE_BUILD(organizationId)}
                  icon={Store}
                  label={tDefault('admin.stores.createAction', '建立門市')}
                  state={{ organizationName: orgName }}
                />
                <QuickAction
                  destructive
                  href="#"
                  icon={Ban}
                  label={tDefault('admin.organizations.disable', '停用組織')}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Edit organization modal */}
      <Modal
        description={tDefault(
          'admin.organizations.modalDescription',
          'Key organization fields only. Membership management will be handled separately.',
        )}
        footer={
          <>
            <Button onClick={vm.closeEditModal} type="button" variant="ghost">
              {tDefault('common.actions.cancel', 'Cancel')}
            </Button>
            <Button
              disabled={vm.form.isSubmitting}
              form="edit-organization-form"
              type="submit"
            >
              {vm.form.isSubmitting
                ? tDefault('common.actions.saving', 'Saving...')
                : tDefault('common.actions.save', 'Save')}
            </Button>
          </>
        }
        isOpen={vm.isEditModalOpen}
        onClose={vm.closeEditModal}
        size="lg"
        title={tDefault('admin.organizations.editTitle', 'Edit organization')}
      >
        <OrganizationForm
          form={vm.form}
          hideFooter
          id="edit-organization-form"
          onCancel={vm.closeEditModal}
          onSubmit={vm.submitOrganization}
          showStatus
        />
      </Modal>
    </>
  );
}
