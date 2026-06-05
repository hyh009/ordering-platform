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
    STORE_LIST: '/admin/organizations/:organizationId/stores',
    STORE_LIST_BUILD: (orgId: string) =>
      `/admin/organizations/${orgId}/stores`,
    STORE_CREATE: '/admin/organizations/:organizationId/stores/new',
    STORE_CREATE_BUILD: (orgId: string) =>
      `/admin/organizations/${orgId}/stores/new`,
    ALLERGENS: '/admin/allergens',
    DIETARY_MARKERS: '/admin/dietary-markers',
  },
  MERCHANT: {
    ROOT: '/merchant',
    SELECT_ORG: '/merchant/select-org',
    SELECT_STORE: '/merchant/select-store',
    MENU: '/merchant/menu',
    ORDERS: '/merchant/orders',
    STORE_SETTINGS: '/merchant/store-settings',
    CATEGORIES: '/merchant/categories',
    MODIFIERS: '/merchant/modifiers',
    MODIFIER_CREATE: '/merchant/modifiers/new',
    MODIFIER_DETAIL: '/merchant/modifiers/:modifierId',
    MODIFIER_DETAIL_BUILD: (id: string) => `/merchant/modifiers/${id}`,
    TAGS: '/merchant/tags',
  },
} as const;
