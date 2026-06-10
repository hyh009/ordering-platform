import type { SupportedLocale } from '@/models/metadata';
import { categoryService } from '@/services/category.service';
import { merchantMetadataService } from '@/services/merchantMetadata.service';
import { productModifierService } from '@/services/productModifier.service';
import { tagService } from '@/services/tag.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { ProductFormOptionsActions } from './actions';
import { buildModifiersById, toOptions } from './mapper';

export type LoadProductFormOptionsResult =
  | { status: 'loaded' }
  | MerchantCommandFailure;

export type ProductFormOptionsCommands = {
  loadFormOptions(
    storeId: string,
    locale: SupportedLocale,
  ): Promise<LoadProductFormOptionsResult>;
};

export function createProductFormOptionsCommands(
  actions: ProductFormOptionsActions,
): ProductFormOptionsCommands {
  return {
    async loadFormOptions(storeId, locale) {
      actions.loadStarted();

      try {
        const [categories, tags, modifiers, allergens, dietaryMarkers] =
          await Promise.all([
            categoryService.listCategories(storeId, 'true'),
            tagService.listTags(storeId, 'true'),
            productModifierService.listProductModifiers(storeId, 'true'),
            merchantMetadataService.listAllergens(),
            merchantMetadataService.listDietaryMarkers(),
          ]);

        actions.loadSucceeded({
          categories: toOptions(categories, locale),
          tags: toOptions(tags, locale),
          modifiers: toOptions(modifiers, locale),
          allergens: toOptions(allergens, locale),
          dietaryMarkers: toOptions(dietaryMarkers, locale),
          modifiersById: buildModifiersById(modifiers),
        });

        return { status: 'loaded' };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
