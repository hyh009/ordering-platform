export const organizationPaths = {
  list: '/v1/organizations',
  detail(organizationId: string) {
    return `/v1/organizations/${encodeURIComponent(organizationId)}`;
  },
} as const;
