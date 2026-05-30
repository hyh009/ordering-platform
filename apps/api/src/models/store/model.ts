import type { LocalizedString, SupportedLocale } from '@src/models/common/model';

export const storeStatuses = ['active', 'disabled'] as const;
export type StoreStatus = (typeof storeStatuses)[number];

export const storeCheckoutModes = ['pay_first', 'pay_later'] as const;
export type StoreCheckoutMode = (typeof storeCheckoutModes)[number];

export const storeOrderTypes = ['dine_in', 'takeaway'] as const;
export type StoreOrderType = (typeof storeOrderTypes)[number];

export type BusinessHour = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
};

export type StoreOrderMode = {
  type: StoreOrderType;
  isEnabled: boolean;
  checkoutMode: StoreCheckoutMode;
};

export type StoreProfile = {
  displayName: LocalizedString;
  description?: LocalizedString;
};

export type StoreLocale = {
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
};

export type StoreOperation = {
  businessHours: BusinessHour[];
  serviceFeeRate: number;
  orderModes: StoreOrderMode[];
};

export type StoreEntity = {
  id: string;
  organizationId: string;
  profile: StoreProfile;
  locale: StoreLocale;
  operation: StoreOperation;
  status: StoreStatus;
  createdAt: Date;
  updatedAt: Date;
};
