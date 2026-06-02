import { apiJson } from '@/api';
import { metadataPaths } from '@/api/paths/metadata.paths';
import { metadataModel } from '@/models/metadata';
import type {
  CreateAllergenRequest,
  CreateAllergenSuccessResponse,
  CreateDietaryMarkerRequest,
  CreateDietaryMarkerSuccessResponse,
  ListAllergensSuccessResponse,
  ListDietaryMarkersSuccessResponse,
  MetadataActiveFilter,
  UpdateAllergenRequest,
  UpdateAllergenSuccessResponse,
  UpdateDietaryMarkerRequest,
  UpdateDietaryMarkerSuccessResponse,
} from '@/models/metadata';

function withActiveFilter(path: string, isActive: MetadataActiveFilter) {
  const params = new URLSearchParams({
    isActive,
  });

  return `${path}?${params.toString()}`;
}

export const metadataService = {
  async listAllergens(isActive: MetadataActiveFilter) {
    const response = await apiJson<ListAllergensSuccessResponse>(
      withActiveFilter(metadataPaths.allergens, isActive),
    );

    return response.data.allergens.map(metadataModel.deserializeAllergen);
  },

  async createAllergen(input: CreateAllergenRequest) {
    const response = await apiJson<CreateAllergenSuccessResponse>(
      metadataPaths.allergens,
      {
        body: JSON.stringify(input),
        method: 'POST',
      },
    );

    return metadataModel.deserializeAllergen(response.data.allergen);
  },

  async updateAllergen(allergenId: string, input: UpdateAllergenRequest) {
    const response = await apiJson<UpdateAllergenSuccessResponse>(
      metadataPaths.allergenDetail(allergenId),
      {
        body: JSON.stringify(input),
        method: 'PATCH',
      },
    );

    return metadataModel.deserializeAllergen(response.data.allergen);
  },

  async listDietaryMarkers(isActive: MetadataActiveFilter) {
    const response = await apiJson<ListDietaryMarkersSuccessResponse>(
      withActiveFilter(metadataPaths.dietaryMarkers, isActive),
    );

    return response.data.dietaryMarkers.map(
      metadataModel.deserializeDietaryMarker,
    );
  },

  async createDietaryMarker(input: CreateDietaryMarkerRequest) {
    const response = await apiJson<CreateDietaryMarkerSuccessResponse>(
      metadataPaths.dietaryMarkers,
      {
        body: JSON.stringify(input),
        method: 'POST',
      },
    );

    return metadataModel.deserializeDietaryMarker(response.data.dietaryMarker);
  },

  async updateDietaryMarker(
    dietaryMarkerId: string,
    input: UpdateDietaryMarkerRequest,
  ) {
    const response = await apiJson<UpdateDietaryMarkerSuccessResponse>(
      metadataPaths.dietaryMarkerDetail(dietaryMarkerId),
      {
        body: JSON.stringify(input),
        method: 'PATCH',
      },
    );

    return metadataModel.deserializeDietaryMarker(response.data.dietaryMarker);
  },
};
