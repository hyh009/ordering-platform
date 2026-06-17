import type { AppTranslator } from '@/app/i18n';
import type {
  BusinessHourDto,
  StoreCheckoutMode,
  StoreOrderType,
} from './types';

// Business-hours marker: an entry whose open and close times are both midnight
// runs around the clock (24h), not a zero-length window. The store form writes
// this marker and read views interpret it, so both must share one definition.
export const STORE_ALL_DAY_TIME = '00:00';

// Formats an open day's hours for display: the all-day marker renders as
// "24 hours", otherwise the open–close range. Callers handle the closed case.
export function formatBusinessHours(
  hour: BusinessHourDto,
  tDefault: AppTranslator,
): string {
  if (
    hour.openTime === STORE_ALL_DAY_TIME &&
    hour.closeTime === STORE_ALL_DAY_TIME
  ) {
    return tDefault('store.businessHours.allDay', '24 hours');
  }
  return `${hour.openTime ?? '—'} – ${hour.closeTime ?? '—'}`;
}

export function getStoreOrderTypeLabel(
  type: StoreOrderType,
  tDefault: AppTranslator,
) {
  switch (type) {
    case 'dine_in':
      return tDefault('store.orderTypes.dineIn', 'Dine-in');
    case 'takeaway':
      return tDefault('store.orderTypes.takeaway', 'Takeaway');
  }
}

export function getStoreOrderTypeDescription(
  type: StoreOrderType,
  tDefault: AppTranslator,
) {
  switch (type) {
    case 'dine_in':
      return tDefault('store.orderTypes.dineInSub', 'In-store dining');
    case 'takeaway':
      return tDefault('store.orderTypes.takeawaySub', 'Pickup');
  }
}

export function getStoreCheckoutModeLabel(
  mode: StoreCheckoutMode,
  tDefault: AppTranslator,
) {
  switch (mode) {
    case 'pay_first':
      return tDefault('store.checkoutModes.payFirst', 'Pay first');
    case 'pay_later':
      return tDefault('store.checkoutModes.payLater', 'Pay later');
  }
}

/**
 * Display-only open check using the browser clock (stores are Taiwan-local for
 * MVP). The backend stays the enforcement point at create/add/submit time.
 */
export function isStoreOpenNow(
  businessHours: BusinessHourDto[],
  now: Date = new Date(),
): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const dayOfWeek = now.getDay();
  const previousDay = (dayOfWeek + 6) % 7;

  const parse = (time: string | undefined) => {
    if (!time) return undefined;
    const [hours = 0, mins = 0] = time.split(':').map(Number);
    return hours * 60 + mins;
  };

  return businessHours.some((entry) => {
    if (!entry.isOpen) return false;

    const open = parse(entry.openTime);
    const close = parse(entry.closeTime);

    if (entry.dayOfWeek === dayOfWeek) {
      if (open === undefined || close === undefined) return true;
      if (open < close) return minutes >= open && minutes < close;
      return minutes >= open;
    }

    if (entry.dayOfWeek === previousDay) {
      if (open === undefined || close === undefined) return false;
      return open >= close && minutes < close;
    }

    return false;
  });
}
