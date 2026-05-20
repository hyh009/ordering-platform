import type {
  Allergen,
  AllergenDto,
  DietaryMarker,
  DietaryMarkerDto,
  LocalizedStringDto,
  SupportedLocale,
} from './metadata.types';

export const supportedMetadataLocales: SupportedLocale[] = ['zh-TW', 'en'];

export function getLocalizedText(
  value: LocalizedStringDto,
  locale: SupportedLocale = 'zh-TW',
) {
  return value[locale] ?? value['zh-TW'] ?? value.en ?? '';
}

export const metadataModel = {
  deserializeAllergen(dto: AllergenDto): Allergen {
    return {
      icon: dto.icon,
      id: dto.id,
      isActive: dto.isActive,
      key: dto.key,
      name: dto.name,
    };
  },

  deserializeDietaryMarker(dto: DietaryMarkerDto): DietaryMarker {
    return {
      icon: dto.icon,
      id: dto.id,
      isActive: dto.isActive,
      key: dto.key,
      name: dto.name,
      type: dto.type,
    };
  },
};
