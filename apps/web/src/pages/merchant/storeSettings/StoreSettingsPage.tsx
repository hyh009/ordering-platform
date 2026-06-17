import { PenSquare } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { StoreDetailsView } from '@/features/components/store/StoreDetailsView';
import { StoreImageUploadField } from '@/features/components/store/StoreImageUploadField';
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
        {vm.canManage && vm.store && !vm.isEditing && (
          <Button
            className="shrink-0"
            type="button"
            variant="outline"
            onClick={vm.startEdit}
          >
            <PenSquare className="mr-2 h-4 w-4" />
            {tDefault('common.actions.edit', 'Edit')}
          </Button>
        )}
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
                disabled={vm.isStatusUpdating}
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

          {vm.canManage && vm.isEditing ? (
            <>
              {/* Branding */}
              <div className="grid gap-6 rounded-xl border border-border bg-card p-8 shadow-sm sm:grid-cols-2">
                {[
                  {
                    kind: 'logo' as const,
                    value: vm.store.profile.logoUrl,
                    label: tDefault(
                      'merchant.storeSettings.branding.logo',
                      'Logo',
                    ),
                    description: tDefault(
                      'merchant.storeSettings.branding.logoHint',
                      'Square image shown next to your store name.',
                    ),
                  },
                  {
                    kind: 'banner' as const,
                    value: vm.store.profile.bannerUrl,
                    label: tDefault(
                      'merchant.storeSettings.branding.banner',
                      'Banner',
                    ),
                    description: tDefault(
                      'merchant.storeSettings.branding.bannerHint',
                      'Wide image shown at the top of your store page.',
                    ),
                  },
                ].map(({ kind, value, label, description }) => (
                  <StoreImageUploadField
                    key={kind}
                    description={description}
                    disabled={vm.imageUpdatingKind !== null}
                    isBusy={vm.imageUpdatingKind === kind}
                    label={label}
                    onRemove={() => void vm.removeImage(kind)}
                    onSelect={(file) => void vm.setImage(kind, file)}
                    value={value}
                    variant={kind}
                  />
                ))}
              </div>

              {/* Settings form */}
              <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
                <StoreForm
                  form={vm.form}
                  hideFooter
                  id="store-settings-form"
                  onCancel={vm.cancelEdit}
                  onSubmit={vm.submit}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  disabled={vm.form.isSubmitting}
                  type="button"
                  variant="ghost"
                  onClick={vm.cancelEdit}
                >
                  {tDefault('common.actions.cancel', 'Cancel')}
                </Button>
                <Button
                  disabled={vm.form.isSubmitting || !vm.isDirty}
                  form="store-settings-form"
                  type="submit"
                >
                  {vm.form.isSubmitting
                    ? tDefault('common.actions.saving', 'Saving...')
                    : tDefault('common.actions.save', 'Save')}
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
              <StoreDetailsView store={vm.store} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
