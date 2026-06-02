import type {
  Allergen,
  AllergenDto,
  DietaryMarker,
  DietaryMarkerDto,
} from './types';

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
