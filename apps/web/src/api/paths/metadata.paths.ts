export const metadataPaths = {
  allergens: '/v1/allergens',
  allergenDetail(allergenId: string) {
    return `/v1/allergens/${encodeURIComponent(allergenId)}`;
  },
  dietaryMarkers: '/v1/dietary-markers',
  dietaryMarkerDetail(dietaryMarkerId: string) {
    return `/v1/dietary-markers/${encodeURIComponent(dietaryMarkerId)}`;
  },
} as const;
