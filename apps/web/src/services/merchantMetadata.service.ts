import { apiJson } from '@/api';
import { merchantMetadataPaths } from '@/api/paths/metadata.paths';
import { metadataModel } from '@/models/metadata';
import type {
  ListAllergensSuccessResponse,
  ListDietaryMarkersSuccessResponse,
} from '@/models/metadata';

// Read-only access to active platform metadata for merchant product authoring.
// Backed by the merchant metadata endpoints, which any authenticated merchant
// may read (unlike the super-admin metadataService).
export const merchantMetadataService = {
  async listAllergens() {
    const response = await apiJson<ListAllergensSuccessResponse>(
      merchantMetadataPaths.allergens,
    );

    return response.data.allergens.map(metadataModel.deserializeAllergen);
  },

  async listDietaryMarkers() {
    const response = await apiJson<ListDietaryMarkersSuccessResponse>(
      merchantMetadataPaths.dietaryMarkers,
    );

    return response.data.dietaryMarkers.map(
      metadataModel.deserializeDietaryMarker,
    );
  },
};
