import type {
  AvailabilityRule,
  LocalizedString,
} from '@src/models/common/model';

export const productModifierSelectionTypes = [
  'single_choice',
  'multiple_choice',
] as const;

export type ProductModifierSelectionType =
  (typeof productModifierSelectionTypes)[number];

export type ProductModifierOption = {
  id: string;
  sharedOptionCode?: string;
  name: LocalizedString;
  priceAdjustment: number;
  isDefault: boolean;
  isActive: boolean;
  isSoldOut: boolean;
};

export type ProductModifierEntity = {
  id: string;
  organizationId: string;
  name: LocalizedString;
  selectionType: ProductModifierSelectionType;
  minSelect: number;
  maxSelect: number;
  options: ProductModifierOption[];
  /**
   * true: use the product/category availability inherited by the menu item.
   * false: use this modifier's availabilityRules instead.
   *
   * availabilityRules=[] means unrestricted availability for this modifier.
   */
  inheritCategoryAvailability: boolean;
  availabilityRules: AvailabilityRule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
