import { useLocation, useParams } from 'react-router';
import { PATHS } from '@/app/routing/paths';
import { StoreForm } from '@/features/components/store/storeForm/StoreForm';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { Button } from '@/shared/components/ui/button';
import { useStoreCreatePageVM } from './useStoreCreatePageVM';

export function StoreCreatePage() {
  const params = useParams();
  const organizationId = params.organizationId ?? '';
  const { state } = useLocation();
  const organizationName = (state as { organizationName?: string } | null)
    ?.organizationName;

  const vm = useStoreCreatePageVM(organizationId, organizationName);

  const breadcrumbItems = [
    {
      label: 'Organizations',
      href: PATHS.SUPER_ADMIN.ORGANIZATIONS,
    },
    {
      label: organizationName ?? 'Organization',
      href: PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL_BUILD(organizationId),
    },
    { label: 'Create store' },
  ];

  return (
    <section className="admin-page-content">
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Create store</h1>
        <p className="mt-1 text-muted-foreground">
          Add a new store under this organization.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <StoreForm
          form={vm.form}
          id="create-store-form"
          onCancel={vm.cancel}
          onSubmit={vm.submit}
          hideFooter
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button
          disabled={vm.form.isSubmitting}
          onClick={vm.cancel}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          disabled={vm.form.isSubmitting}
          form="create-store-form"
          type="submit"
        >
          {vm.form.isSubmitting ? 'Creating...' : 'Create store'}
        </Button>
      </div>
    </section>
  );
}
