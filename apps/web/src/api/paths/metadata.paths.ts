export const metadataPaths = {
  allergens: '/v1/admin/allergens',
  allergenDetail(allergenId: string) {
    return `/v1/admin/allergens/${encodeURIComponent(allergenId)}`;
  },
  dietaryMarkers: '/v1/admin/dietary-markers',
  dietaryMarkerDetail(dietaryMarkerId: string) {
    return `/v1/admin/dietary-markers/${encodeURIComponent(dietaryMarkerId)}`;
  },
} as const;
