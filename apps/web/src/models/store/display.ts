import type { StoreCheckoutMode, StoreOrderType } from '@repo/shared';
import type { AppTranslator } from '@/app/i18n';

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
