import { useAppTranslation } from '@/app/i18n';
import { useLocalizedText } from '@/features/guest/components/useLocalizedText';
import type { StoreOrderType } from '@/models/store';
import { Button } from '@/shared/components/ui/button';
import { useLandingPageVM } from './useLandingPageVM';

export function LandingPage() {
  const vm = useLandingPageVM();
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();

  if (vm.isLoading && !vm.store) {
    return (
      <p className="p-6 text-center text-muted-foreground">
        {tDefault('common.loading', 'Loading…')}
      </p>
    );
  }

  if (vm.error || !vm.store) {
    return (
      <p className="p-6 text-center text-muted-foreground">
        {vm.error ??
          tDefault('guest.landing.storeNotFound', 'Store not found.')}
      </p>
    );
  }

  const orderTypeLabel = (type: StoreOrderType) =>
    type === 'dine_in'
      ? tDefault('store.orderTypes.dineIn', 'Dine-in')
      : tDefault('store.orderTypes.takeaway', 'Takeaway');

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">{localize(vm.store.displayName)}</h1>
        {vm.store.description ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {localize(vm.store.description)}
          </p>
        ) : null}
        {vm.tableNumber ? (
          <p className="mt-2 text-sm font-medium">
            {tDefault('guest.landing.table', 'Table')} {vm.tableNumber}
          </p>
        ) : null}
        {!vm.isOpen ? (
          <p className="mt-3 rounded bg-muted px-3 py-2 text-sm text-muted-foreground">
            {tDefault('guest.landing.closed', 'The store is currently closed.')}
          </p>
        ) : null}
      </header>

      {vm.canResume ? (
        <Button onClick={vm.resume}>
          {tDefault('guest.landing.resume', 'Resume your order')}
        </Button>
      ) : null}

      <div className="flex flex-col gap-3">
        {vm.enabledOrderTypes.length > 1 ? (
          <div className="grid grid-cols-2 gap-3">
            {vm.enabledOrderTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => vm.setSelectedOrderType(type)}
                className={`rounded-lg border p-4 text-center font-medium transition ${
                  vm.selectedOrderType === type
                    ? 'border-primary bg-primary/10'
                    : 'border-border'
                }`}
              >
                {orderTypeLabel(type)}
              </button>
            ))}
          </div>
        ) : null}

        <Button
          disabled={!vm.isOpen || !vm.selectedOrderType || vm.isMutating}
          onClick={() => {
            void vm.startOrder();
          }}
        >
          {tDefault('guest.landing.startOrder', 'Start ordering')}
        </Button>
      </div>
    </div>
  );
}
