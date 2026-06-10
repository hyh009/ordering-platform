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

// Read-only platform metadata for merchant product authoring. Separate from the
// super-admin metadataPaths above: any authenticated merchant may read these.
export const merchantMetadataPaths = {
  allergens: '/v1/merchant/metadata/allergens',
  dietaryMarkers: '/v1/merchant/metadata/dietary-markers',
} as const;
