import type { ApiSuccessResponse } from './api.js';
import type { AvailabilityRuleDto } from './menuShared.js';
import type { LocalizedStringDto } from './metadata.js';
import type {
  BusinessHourDto,
  StoreLocaleDto,
  StoreOrderType,
  StoreCheckoutMode,
} from './store.js';

/**
 * Guest-facing contracts. Only published, active menu data is exposed and
 * merchant-only fields (status, isActive, tags, audit context) are omitted.
 */

export type PublicStoreOrderModeDto = {
  type: StoreOrderType;
  checkoutMode: StoreCheckoutMode;
};

export type PublicStoreDto = {
  id: string;
  displayName: LocalizedStringDto;
  description?: LocalizedStringDto;
  logoUrl?: string;
  bannerUrl?: string;
  locale: StoreLocaleDto;
  businessHours: BusinessHourDto[];
  serviceFeeRate: number;
  /** Enabled order modes only. */
  orderModes: PublicStoreOrderModeDto[];
};

export type PublicCategoryDto = {
  id: string;
  name: LocalizedStringDto;
  description?: LocalizedStringDto;
  imageUrl?: string;
  displayOrder: number;
  availabilityRules: AvailabilityRuleDto[];
};

export type PublicModifierOptionDto = {
  id: string;
  name: LocalizedStringDto;
  priceAdjustment: number;
  isDefault: boolean;
  isSoldOut: boolean;
};

export type PublicModifierDto = {
  id: string;
  name: LocalizedStringDto;
  selectionType: 'single_choice' | 'multiple_choice';
  minSelect: number;
  maxSelect: number;
  options: PublicModifierOptionDto[];
};

export type PublicProductDto = {
  id: string;
  categoryIds: string[];
  name: LocalizedStringDto;
  description?: LocalizedStringDto;
  imageUrls: string[];
  price: number;
  tagIds: string[];
  allergenIds: string[];
  dietaryMarkerIds: string[];
  modifierIds: string[];
  isSoldOut: boolean;
};

export type PublicMetadataItemDto = {
  id: string;
  name: LocalizedStringDto;
};

export type PublicTagDto = {
  id: string;
  name: LocalizedStringDto;
  color?: string;
};

export type PublicMenuDto = {
  categories: PublicCategoryDto[];
  products: PublicProductDto[];
  modifiers: PublicModifierDto[];
  tags: PublicTagDto[];
  allergens: PublicMetadataItemDto[];
  dietaryMarkers: PublicMetadataItemDto[];
};

export type GetPublicStoreSuccessResponse = ApiSuccessResponse<{
  store: PublicStoreDto;
}>;

export type GetPublicMenuSuccessResponse = ApiSuccessResponse<{
  menu: PublicMenuDto;
}>;
