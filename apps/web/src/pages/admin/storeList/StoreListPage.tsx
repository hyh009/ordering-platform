import { useLocation, useParams } from 'react-router';
import { Plus, Store } from 'lucide-react';
import { PATHS } from '@/app/routing/paths';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { LoadingState } from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';
import { useStoreListPageVM } from './useStoreListPageVM';
import type { StoreListItem as StoreModel } from '@/models/store';

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-rose-500')} />
      {status}
    </span>
  );
}

function StoreRow({ store }: { store: StoreModel }) {
  const displayName =
    store.profile.displayName['zh-TW'] ?? store.profile.displayName.en ?? store.id;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Store className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{displayName}</p>
            {store.profile.displayName.en && store.profile.displayName['zh-TW'] && (
              <p className="truncate text-xs text-muted-foreground">
                {store.profile.displayName.en}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={store.status} />
      </td>
      <td className="px-5 py-4">
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
      </td>
      <td className="px-5 py-4 text-sm text-muted-foreground">
        {new Date(store.updatedAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

export function StoreListPage() {
  const params = useParams();
  const organizationId = params.organizationId ?? '';
  const { state } = useLocation();
  const organizationName = (state as { organizationName?: string } | null)
    ?.organizationName;

  const vm = useStoreListPageVM(organizationId);

  const breadcrumbItems = [
    { label: 'Organizations', href: PATHS.SUPER_ADMIN.ORGANIZATIONS },
    {
      label: organizationName ?? 'Organization',
      href: PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organizationId),
    },
    { label: 'Stores' },
  ];

  return (
    <section className="admin-page-content">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Stores</h1>
          <p className="mt-1 text-muted-foreground">
            All stores under this organization.
          </p>
        </div>
        <Button className="mt-4 shrink-0" onClick={vm.goToCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create store
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {vm.isLoading ? (
          <LoadingState label="Loading stores" />
        ) : vm.error ? (
          <p className="px-5 py-4 text-sm text-destructive">{vm.error}</p>
        ) : vm.stores.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No stores yet</p>
            <p className="text-xs text-muted-foreground">
              Create the first store for this organization.
            </p>
            <Button onClick={vm.goToCreate} size="sm" variant="outline">
              <Plus className="mr-2 h-3.5 w-3.5" />
              Create store
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">
                  Store
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">
                  Languages
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">
                  Last updated
                </th>
              </tr>
            </thead>
            <tbody>
              {vm.stores.map((store) => (
                <StoreRow key={store.id} store={store} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
