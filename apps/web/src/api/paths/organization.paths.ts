export const organizationPaths = {
  list: '/v1/organizations',
  detail(organizationId: string) {
    return `/v1/organizations/${encodeURIComponent(organizationId)}`;
  },
  memberships(organizationId: string) {
    return `/v1/organizations/${encodeURIComponent(organizationId)}/memberships`;
  },
  membership(organizationId: string, membershipId: string) {
    return `/v1/organizations/${encodeURIComponent(organizationId)}/memberships/${encodeURIComponent(membershipId)}`;
  },
};
