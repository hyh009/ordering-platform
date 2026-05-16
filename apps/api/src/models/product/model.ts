import type {
  AvailabilityRule,
  LocalizedString,
} from '@src/models/common/model';

export type ProductEntity = {
  id: string;
  organizationId: string;
  categoryId: string;
  name: LocalizedString;
  description?: LocalizedString;
  imageUrl?: string;
  price: number;
  tagIds: string[];
  allergenIds: string[];
  dietaryMarkerIds: string[];
  modifierIds: string[];
  /**
   * true: use the category availability rules.
   * false: use this product's availabilityRules instead.
   *
   * availabilityRules=[] means unrestricted availability, so false + [] means
   * this product overrides the category and is available all day.
   */
  inheritCategoryAvailability: boolean;
  availabilityRules: AvailabilityRule[];
  isActive: boolean;
  isSoldOut: boolean;
  createdAt: Date;
  updatedAt: Date;
};
