import { CheckCircle2, ShoppingBag, Store, Users } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { useLanguageVM } from '@/app/i18n/useLanguageVM';
import logoUrl from '@/assets/logo.svg';
import { useLocalizedText } from '@/features/guest/components/useLocalizedText';
import type { StoreOrderType } from '@/models/store';
import { Button } from '@/shared/components/ui/button';
import { useLandingPageVM } from './useLandingPageVM';

export function LandingPage() {
  const vm = useLandingPageVM();
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();
  const language = useLanguageVM();

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

  const today = new Date().getDay();
  const todayHours = vm.store.businessHours.find((h) => h.dayOfWeek === today);
  const hoursText =
    todayHours?.isOpen && todayHours.openTime && todayHours.closeTime
      ? `${todayHours.openTime} - ${todayHours.closeTime}`
      : null;

  const orderTypeLabel = (type: StoreOrderType) =>
    type === 'dine_in'
      ? tDefault('store.orderTypes.dineIn', 'Dine-in')
      : tDefault('store.orderTypes.takeaway', 'Takeaway');

  const orderTypeSubLabel = (type: StoreOrderType) =>
    type === 'dine_in'
      ? tDefault('store.orderTypes.dineInSub', 'In-store dining')
      : tDefault('store.orderTypes.takeawaySub', 'Pickup');

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <div className="relative h-48 overflow-hidden bg-linear-to-br from-storefront-border via-storefront-bg to-storefront-primary/20 md:h-64">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-4">
          <div className="hidden items-center gap-2 md:flex">
            <img alt="" className="h-8 w-8" src={logoUrl} />
          </div>
          <div className="md:hidden" />
          <div>
            <label className="sr-only" htmlFor="guest-language">
              {tDefault('app.navigation.language', 'Language')}
            </label>
            <select
              className="h-8 cursor-pointer rounded-lg border border-storefront-border bg-storefront-bg/80 px-2.5 text-sm text-storefront-text backdrop-blur-sm"
              id="guest-language"
              value={language.currentLanguage}
              onChange={(e) => {
                void language.changeLanguage(e.target.value);
              }}
            >
              {language.languageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center bg-storefront-bg px-4 pb-10 md:px-8">
        {/* Store icon — overlaps hero bottom */}
        <div className="relative -mt-10 z-10 flex h-20 w-20 items-center justify-center rounded-full border-4 border-storefront-bg bg-storefront-bg shadow-lg">
          <Store className="h-9 w-9 text-storefront-primary" />
        </div>

        {/* Single max-width wrapper — children fill with w-full / flex-1 / grid */}
        <div className="mt-3 w-full max-w-2xl">
          {/* Store info */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-storefront-text">
              {localize(vm.store.displayName)}
            </h1>
            {vm.store.description ? (
              <p className="mt-1 text-sm text-storefront-text-muted">
                {localize(vm.store.description)}
              </p>
            ) : null}

            <div className="mt-3 flex justify-center">
              {vm.isOpen ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-storefront-secondary/15 px-3 py-1 text-sm font-medium text-storefront-secondary">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {tDefault('guest.landing.open', 'Open')}
                  {hoursText ? (
                    <span className="font-normal">{hoursText}</span>
                  ) : null}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-storefront-border px-3 py-1 text-sm font-medium text-storefront-text-muted">
                  {tDefault('guest.landing.closed', 'Closed')}
                </span>
              )}
            </div>

            {vm.tableNumber ? (
              <p className="mt-2 text-sm font-medium text-storefront-text">
                {tDefault('guest.landing.table', 'Table')} {vm.tableNumber}
              </p>
            ) : null}
          </div>

          {/* Order type picker */}
          <div className="mt-7">
            <p className="text-center font-semibold">
              {tDefault('guest.landing.howToOrder', 'How would you like to order?')}
            </p>
            <p className="mt-0.5 text-center text-sm text-storefront-text-muted">
              {tDefault('guest.landing.selectOrderMode', 'Select a dining option')}
            </p>

            {vm.enabledOrderTypes.length > 1 ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {vm.enabledOrderTypes.map((type) => (
                  <button
                    key={type}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 transition ${
                      vm.selectedOrderType === type
                        ? 'border-storefront-primary bg-storefront-primary/10'
                        : 'border-storefront-border bg-storefront-bg hover:border-storefront-primary/50'
                    }`}
                    type="button"
                    onClick={() => vm.setSelectedOrderType(type)}
                  >
                    {type === 'dine_in' ? (
                      <Users className="h-8 w-8 text-storefront-text-muted" />
                    ) : (
                      <ShoppingBag className="h-8 w-8 text-storefront-text-muted" />
                    )}
                    <span className="font-semibold text-storefront-text">
                      {orderTypeLabel(type)}
                    </span>
                    <span className="text-xs text-storefront-text-muted">
                      {orderTypeSubLabel(type)}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Resume session */}
          {vm.canResume ? (
            <div className="mt-5 rounded-xl border border-storefront-border bg-storefront-bg p-4">
              <p className="font-medium text-storefront-text">
                {tDefault('guest.landing.hasActiveOrder', 'You have an active order')}
              </p>
              <p className="text-sm text-storefront-text-muted">
                {tDefault(
                  'guest.landing.previousOrderPending',
                  'Your previous order is still open',
                )}
              </p>
              <Button className="mt-3 w-full" variant="storefront" onClick={vm.resume}>
                {tDefault('guest.landing.resume', 'Resume order')}
              </Button>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="mt-4 flex gap-3">
            <Button
              className="flex-1"
              disabled={!vm.isOpen || !vm.selectedOrderType || vm.isMutating}
              variant={vm.canResume ? 'outline' : 'storefront'}
              onClick={() => {
                void vm.startOrder();
              }}
            >
              {tDefault('guest.landing.startOrder', 'New order')}
            </Button>
            <Button className="flex-1" disabled variant="outline">
              {tDefault('guest.landing.joinOrder', 'Join order')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
