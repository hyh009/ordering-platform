import type {
  LocalizedString,
  SupportedLocale,
} from '@src/models/common/model';

export const storeSettingsCheckoutModes = ['pay_first', 'pay_later'] as const;

export type StoreSettingsCheckoutMode =
  (typeof storeSettingsCheckoutModes)[number];

export type BusinessHour = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
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
  checkoutMode: StoreSettingsCheckoutMode;
  createdAt: Date;
  updatedAt: Date;
};
