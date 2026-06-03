import type { LocalizedString } from '@src/models/common/model';

export type ProductEntity = {
  id: string;
  organizationId: string;
  storeId: string;
  // A product can belong to several categories. Availability is not stored on
  // the product; it is derived from these categories (category is the single
  // source of availability rules).
  categoryIds: string[];
  name: LocalizedString;
  description?: LocalizedString;
  imageUrl?: string;
  price: number;
  tagIds: string[];
  allergenIds: string[];
  dietaryMarkerIds: string[];
  modifierIds: string[];
  isActive: boolean;
  isSoldOut: boolean;
  createdAt: Date;
  updatedAt: Date;
};
