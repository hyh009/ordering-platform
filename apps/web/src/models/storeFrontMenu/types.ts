import type {
  BusinessHourDto,
  GetPublicMenuSuccessResponse,
  GetPublicStoreSuccessResponse,
  LocalizedStringDto,
  PublicCategoryDto,
  PublicMenuDto,
  PublicMenuGroupDto,
  PublicMetadataItemDto,
  PublicModifierDto,
  PublicModifierOptionDto,
  PublicProductDto,
  PublicStoreDto,
  PublicStoreOrderModeDto,
  PublicTagDto,
} from '@repo/shared';

export type {
  BusinessHourDto,
  GetPublicMenuSuccessResponse,
  GetPublicStoreSuccessResponse,
  LocalizedStringDto,
};

export type PublicStore = PublicStoreDto;
export type PublicStoreOrderMode = PublicStoreOrderModeDto;
export type PublicMenu = PublicMenuDto;
export type PublicCategory = PublicCategoryDto;
export type PublicProduct = PublicProductDto;
export type PublicModifier = PublicModifierDto;
export type PublicModifierOption = PublicModifierOptionDto;
export type PublicMetadataItem = PublicMetadataItemDto;
export type PublicTag = PublicTagDto;

/**
 * A menu section from the backend. `category` is null for the trailing bucket
 * of products that have no category.
 */
export type MenuCategoryGroup = PublicMenuGroupDto;
