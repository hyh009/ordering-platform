import type {
  LocalizedString,
  SupportedLocale,
} from '@src/models/common/model';

export const storeSettingsCheckoutModes = ['pay_first', 'pay_later'] as const;

export type StoreSettingsCheckoutMode =
  (typeof storeSettingsCheckoutModes)[number];

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
  checkoutMode: StoreSettingsCheckoutMode;
};

export type StoreSettingsEntity = {
  id: string;
  organizationId: string;
  displayName: LocalizedString;
  description?: LocalizedString;
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
  businessHours: BusinessHour[];
  serviceFeeRate: number;
  orderModes: StoreOrderMode[];
  createdAt: Date;
  updatedAt: Date;
};
