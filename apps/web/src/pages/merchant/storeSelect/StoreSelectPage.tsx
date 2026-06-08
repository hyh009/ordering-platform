import { useStoreSelectPageVM } from './useStoreSelectPageVM';

export function StoreSelectPage() {
  const vm = useStoreSelectPageVM();

  return (
    <section className="mx-auto w-full max-w-lg px-5 py-12">
      <h1 className="mb-1 text-2xl font-bold">Select Store</h1>
      {vm.organizationName && (
        <p className="mb-6 text-sm text-muted-foreground">
          {vm.organizationName}
        </p>
      )}

      {vm.isLoading && <p className="text-muted-foreground">Loading stores…</p>}

      {vm.error && <p className="text-destructive">{vm.error}</p>}

      {!vm.isLoading && !vm.error && vm.stores.length === 0 && (
        <p className="text-muted-foreground">
          No stores found for this organization.
        </p>
      )}

      {!vm.isLoading && vm.stores.length > 0 && (
        <ul className="flex flex-col gap-3">
          {vm.stores.map((store) => (
            <li key={store.id}>
              <button
                className={
                  'w-full rounded-lg border px-5 py-4 text-left transition-colors hover:bg-muted ' +
                  (vm.activeStoreId === store.id
                    ? 'border-primary bg-muted font-semibold'
                    : 'border-border bg-background')
                }
                type="button"
                onClick={() => vm.selectStore(store.id)}
              >
                <div className="font-medium">
                  {store.profile.displayName['zh-TW'] ??
                    store.profile.displayName.en ??
                    store.id}
                </div>
                <div className="mt-1 text-xs capitalize text-muted-foreground">
                  {store.status}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
