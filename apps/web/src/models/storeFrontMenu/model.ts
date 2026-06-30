import type { PublicMenuDto, PublicStoreDto } from '@repo/shared';
import type { PublicMenu, PublicStore } from './types';

export const storeFrontMenuModel = {
  deserializeStore(dto: PublicStoreDto): PublicStore {
    const store: PublicStore = {
      id: dto.id,
      displayName: dto.displayName,
      locale: dto.locale,
      businessHours: dto.businessHours,
      serviceFeeRate: dto.serviceFeeRate,
      orderModes: dto.orderModes,
    };

    if (dto.description !== undefined) {
      store.description = dto.description;
    }

    if (dto.logoUrl !== undefined) {
      store.logoUrl = dto.logoUrl;
    }

    if (dto.bannerUrl !== undefined) {
      store.bannerUrl = dto.bannerUrl;
    }

    return store;
  },

  deserializeMenu(dto: PublicMenuDto): PublicMenu {
    return {
      categories: dto.categories,
      products: dto.products,
      modifiers: dto.modifiers,
      tags: dto.tags,
      allergens: dto.allergens,
      dietaryMarkers: dto.dietaryMarkers,
    };
  },
};
