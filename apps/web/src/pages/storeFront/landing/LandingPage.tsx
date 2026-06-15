import { CheckCircle2, Store } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { useLanguageVM } from '@/app/i18n/useLanguageVM';
import logoUrl from '@/assets/logo.svg';
import { OrderTypeSelector } from '@/features/storeFront/components/OrderTypeSelector';
import { useLocalizedText } from '@/features/storeFront/components/useLocalizedText';
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

          {vm.entryMode === 'chooser' && vm.canResume ? (
            <div className="mt-5 rounded-xl border border-storefront-border bg-storefront-bg p-4">
              <p className="font-medium text-storefront-text">
                {tDefault(
                  'guest.landing.hasActiveOrder',
                  'You have an active order',
                )}
              </p>
              <p className="text-sm text-storefront-text-muted">
                {tDefault(
                  'guest.landing.previousOrderPending',
                  'Your previous order is still open',
                )}
              </p>
              <Button
                className="mt-3 w-full"
                variant="storefront"
                onClick={vm.resume}
              >
                {tDefault('guest.landing.resume', 'Resume order')}
              </Button>
            </div>
          ) : null}

          {vm.entryMode === 'chooser' ? (
            <>
              <div className="mt-4 flex gap-3">
                <Button
                  className="flex-1"
                  disabled={!vm.isOpen}
                  variant={vm.canResume ? 'outline' : 'storefront'}
                  onClick={vm.showNewOrder}
                >
                  {tDefault('guest.landing.startOrder', 'New order')}
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={vm.goToJoin}
                >
                  {tDefault('guest.landing.joinOrder', 'Join order')}
                </Button>
              </div>
              {vm.hasOrderHistory ? (
                <div className="mt-8 border-t border-storefront-border pt-5">
                  <Button
                    className="w-full"
                    variant="ghost"
                    onClick={vm.goToOrderHistory}
                  >
                    {tDefault(
                      'guest.landing.recentOrders',
                      'View recent orders',
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-7">
              <p className="text-center font-semibold">
                {tDefault(
                  'guest.landing.howToOrder',
                  'How would you like to order?',
                )}
              </p>
              <p className="mt-0.5 text-center text-sm text-storefront-text-muted">
                {tDefault(
                  'guest.landing.selectOrderMode',
                  'Select a dining option',
                )}
              </p>
              <div className="mt-3">
                <OrderTypeSelector
                  availableTypes={vm.enabledOrderTypes}
                  disabled={!vm.isOpen || vm.isMutating}
                  value={vm.selectedOrderType}
                  onChange={(type) => {
                    void vm.startOrder(type);
                  }}
                />
              </div>
              <div className="mt-4">
                <Button
                  className="w-full"
                  disabled={vm.isMutating}
                  variant="outline"
                  onClick={vm.cancelNewOrder}
                >
                  {tDefault('common.cancel', 'Cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
