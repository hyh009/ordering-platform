export const PATHS = {
  AUTH: {
    LOGIN: '/login',
  },
  SUPER_ADMIN: {
    ROOT: '/admin',
    OVERVIEW: '/admin/overview',
    ORGANIZATIONS: '/admin/organizations',
    ORGANIZATION_DETAIL: '/admin/organizations/:organizationId',
    ORGANIZATION_DETAIL_BUILD: (id: string) => `/admin/organizations/${id}`,
    ORGANIZATION_MEMBERSHIPS: '/admin/organizations/:organizationId/memberships',
    ORGANIZATION_MEMBERSHIPS_BUILD: (id: string) =>
      `/admin/organizations/${id}/memberships`,
    ALLERGENS: '/admin/allergens',
    DIETARY_MARKERS: '/admin/dietary-markers',
  },
  MERCHANT: {
    ROOT: '/merchant',
    MENU: '/merchant/menu',
    ORDERS: '/merchant/orders',
    STORE_SETTINGS: '/merchant/store-settings',
    CATEGORIES: '/merchant/categories',
    TAGS: '/merchant/tags',
  },
} as const;
