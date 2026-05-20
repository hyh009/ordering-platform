import { toAllergenDto } from '@src/models/allergen/mapper';
import { toDietaryMarkerDto } from '@src/models/dietaryMarker/mapper';
import { allergenRepository } from '@src/repositories/allergen/repository';
import { dietaryMarkerRepository } from '@src/repositories/dietaryMarker/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import { ConflictError, NotFoundError } from '@src/utils/errors';
import { isMongoDuplicateKeyError } from '@src/utils/mongoError';

import type {
  AllergenDto,
  CreateAllergenRequest,
  CreateDietaryMarkerRequest,
  DietaryMarkerDto,
  MetadataActiveFilter,
  UpdateAllergenRequest,
  UpdateDietaryMarkerRequest,
} from '@repo/shared';

function toActiveFilter(filter: MetadataActiveFilter): boolean | undefined {
  if (filter === 'all') {
    return undefined;
  }

  return filter === 'true';
}

export class MetadataService {
  public async listAllergens(
    activeFilter: MetadataActiveFilter,
  ): Promise<AllergenDto[]> {
    const allergens = await allergenRepository.list({
      isActive: toActiveFilter(activeFilter),
    });

    return allergens.map(toAllergenDto);
  }

  public async createAllergen(
    input: CreateAllergenRequest,
  ): Promise<AllergenDto> {
    try {
      const allergen = await allergenRepository.create(input);

      return toAllergenDto(allergen);
    } catch (error) {
      if (isMongoDuplicateKeyError(error)) {
        throw new ConflictError(
          'Allergen already exists',
          ERROR_CODES.ALLERGEN_ALREADY_EXISTS,
        );
      }

      throw error;
    }
  }

  public async updateAllergen(
    allergenId: string,
    input: UpdateAllergenRequest,
  ): Promise<AllergenDto> {
    const allergen = await allergenRepository.update(allergenId, input);

    if (!allergen) {
      throw new NotFoundError(
        'Allergen not found',
        ERROR_CODES.ALLERGEN_NOT_FOUND,
      );
    }

    return toAllergenDto(allergen);
  }

  public async listDietaryMarkers(
    activeFilter: MetadataActiveFilter,
  ): Promise<DietaryMarkerDto[]> {
    const dietaryMarkers = await dietaryMarkerRepository.list({
      isActive: toActiveFilter(activeFilter),
    });

    return dietaryMarkers.map(toDietaryMarkerDto);
  }

  public async createDietaryMarker(
    input: CreateDietaryMarkerRequest,
  ): Promise<DietaryMarkerDto> {
    try {
      const dietaryMarker = await dietaryMarkerRepository.create(input);

      return toDietaryMarkerDto(dietaryMarker);
    } catch (error) {
      if (isMongoDuplicateKeyError(error)) {
        throw new ConflictError(
          'Dietary marker already exists',
          ERROR_CODES.DIETARY_MARKER_ALREADY_EXISTS,
        );
      }

      throw error;
    }
  }

  public async updateDietaryMarker(
    dietaryMarkerId: string,
    input: UpdateDietaryMarkerRequest,
  ): Promise<DietaryMarkerDto> {
    const dietaryMarker = await dietaryMarkerRepository.update(
      dietaryMarkerId,
      input,
    );

    if (!dietaryMarker) {
      throw new NotFoundError(
        'Dietary marker not found',
        ERROR_CODES.DIETARY_MARKER_NOT_FOUND,
      );
    }

    return toDietaryMarkerDto(dietaryMarker);
  }
}

export function createMetadataService() {
  return new MetadataService();
}

export const metadataService = createMetadataService();
