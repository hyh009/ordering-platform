import { useLocation, useParams } from 'react-router';
import { Plus, Store } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import type { StoreListItem as StoreModel } from '@/models/store';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { LoadingState } from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';
import { useStoreListPageVM } from './useStoreListPageVM';

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

export function StoreListPage() {
  const params = useParams();
  const organizationId = params.organizationId ?? '';
  const { state } = useLocation();
  const organizationName = (state as { organizationName?: string } | null)
    ?.organizationName;
  const { tDefault } = useAppTranslation();

  const vm = useStoreListPageVM(organizationId);

  const breadcrumbItems = [
    {
      label: tDefault('admin.organizations.title', 'Organizations'),
      href: PATHS.SUPER_ADMIN.ORGANIZATIONS,
    },
    {
      label:
        organizationName ??
        tDefault('admin.organizations.singular', 'Organization'),
      href: PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organizationId),
    },
    { label: tDefault('admin.stores.title', 'Stores') },
  ];

  const columns: DataTableColumn<StoreModel>[] = [
    {
      key: 'store',
      header: tDefault('admin.stores.store', 'Store'),
      className: 'pl-4',
      render: (store) => {
        const displayName =
          store.profile.displayName['zh-TW'] ??
          store.profile.displayName.en ??
          store.id;
        const subtitle =
          store.profile.displayName.en && store.profile.displayName['zh-TW']
            ? store.profile.displayName.en
            : null;

        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Store className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: tDefault('admin.stores.status', 'Status'),
      render: (store) => <StatusBadge status={store.status} />,
    },
    {
      key: 'languages',
      header: tDefault('admin.stores.languages', 'Languages'),
      render: (store) => (
        <div className="flex flex-wrap gap-1">
          {store.locale.supportedLocales.map((locale) => {
            const isDefault = locale === store.locale.defaultLocale;
            return (
              <span
                key={locale}
                className={cn(
                  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                  isDefault
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {locale}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      key: 'updatedAt',
      header: tDefault('common.fields.updatedAt', 'Last updated'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (store) => new Date(store.updatedAt).toLocaleDateString(),
    },
  ];

  if (vm.isLoading && vm.stores.length === 0) {
    return (
      <LoadingState
        label={tDefault('admin.stores.loading', 'Loading stores')}
      />
    );
  }

  return (
    <section className="admin-page-content">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            {tDefault('admin.stores.title', 'Stores')}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {tDefault(
              'admin.stores.description',
              'All stores under this organization.',
            )}
          </p>
        </div>
        <Button className="mt-4 shrink-0" onClick={vm.goToCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {tDefault('admin.stores.createAction', 'Create store')}
        </Button>
      </div>

      {vm.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        data={vm.stores}
        isLoading={vm.isLoading}
        labels={{ empty: tDefault('admin.stores.empty', 'No stores yet.') }}
        limit={vm.pagination.limit}
        limitOptions={[10, 20, 50]}
        onLimitChange={(limit) => void vm.changeLimit(limit)}
        pagination={{
          type: 'offset',
          page: vm.page,
          totalPages: vm.totalPages,
          onPageChange: (page) => void vm.goToPage(page),
        }}
        rowKey={(store) => store.id}
      />
    </section>
  );
}
