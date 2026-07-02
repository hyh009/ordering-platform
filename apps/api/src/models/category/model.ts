import type {
  AvailabilityRule,
  LocalizedString,
} from '@src/models/common/model';

export type CategoryEntity = {
  id: string;
  organizationId: string;
  storeId: string;
  name: LocalizedString;
  description?: LocalizedString;
  imageUrl?: string;
  displayOrder: number;
  // Ordering projection only: product.categoryIds is the membership truth.
  // productOrder is normalized against current category members on write and
  // must never be used to decide whether a product belongs to this category.
  productOrder: string[];
  isActive: boolean;
  availabilityRules: AvailabilityRule[];
  createdAt: Date;
  updatedAt: Date;
};
