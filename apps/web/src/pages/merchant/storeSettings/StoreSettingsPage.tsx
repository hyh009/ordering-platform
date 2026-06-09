import { useAppTranslation } from '@/app/i18n';
import { StoreForm } from '@/features/components/store/storeForm/StoreForm';
import { StoreStatusBadge } from '@/features/components/store/StoreStatusBadge';
import { Button } from '@/shared/components/ui/button';
import { useStoreSettingsPageVM } from './useStoreSettingsPageVM';

export function StoreSettingsPage() {
  const { tDefault } = useAppTranslation();
  const vm = useStoreSettingsPageVM();

  return (
    <section className="admin-page-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
            {tDefault('merchant.storeSettings.title', 'Store Settings')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'merchant.storeSettings.description',
              'Manage your store profile, operating hours, and order settings.',
            )}
          </p>
        </div>
      </div>

      {vm.isLoading && (
        <p className="text-muted-foreground">
          {tDefault('common.loading', 'Loading…')}
        </p>
      )}

      {!vm.isLoading && vm.loadError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.loadError}
        </p>
      )}

      {!vm.isLoading && vm.store && (
        <>
          {/* Status section */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {tDefault('merchant.storeSettings.status', 'Status')}
              </span>
              <StoreStatusBadge status={vm.store.status} />
            </div>
            {vm.canManage && (
              <Button
                disabled={vm.isSaving}
                size="sm"
                type="button"
                variant="outline"
                onClick={vm.toggleStatus}
              >
                {vm.store.status === 'active'
                  ? tDefault(
                      'merchant.storeSettings.disableStore',
                      'Disable store',
                    )
                  : tDefault(
                      'merchant.storeSettings.enableStore',
                      'Enable store',
                    )}
              </Button>
            )}
          </div>

          {/* Settings form */}
          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
            <StoreForm
              form={vm.form}
              hideFooter
              id="store-settings-form"
              onCancel={() => undefined}
              onSubmit={vm.submit}
            />
          </div>

          {vm.canManage && (
            <div className="flex justify-end border-t border-border pt-4">
              <Button
                disabled={vm.form.isSubmitting}
                form="store-settings-form"
                type="submit"
              >
                {vm.form.isSubmitting
                  ? tDefault('common.actions.saving', 'Saving...')
                  : tDefault('common.actions.save', 'Save')}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
