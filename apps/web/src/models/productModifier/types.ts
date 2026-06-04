import type {
  CreateProductModifierRequest,
  LocalizedStringDto,
  ProductModifierActiveFilter,
  ProductModifierDto,
  ProductModifierOptionDto,
  ProductModifierSelectionType,
  UpdateProductModifierRequest,
} from '@repo/shared';

export type ProductModifierOption = {
  id: string;
  sharedOptionCode?: string;
  name: LocalizedStringDto;
  priceAdjustment: number;
  isDefault: boolean;
  isActive: boolean;
  isSoldOut: boolean;
};

export type ProductModifier = {
  id: string;
  storeId: string;
  name: LocalizedStringDto;
  selectionType: ProductModifierSelectionType;
  minSelect: number;
  maxSelect: number;
  options: ProductModifierOption[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type {
  CreateProductModifierRequest,
  LocalizedStringDto,
  ProductModifierActiveFilter,
  ProductModifierDto,
  ProductModifierOptionDto,
  ProductModifierSelectionType,
  UpdateProductModifierRequest,
};
