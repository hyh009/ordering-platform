export {
  organizationMembershipRoles,
  organizationMembershipStatuses,
} from '@repo/shared';

import type {
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
} from '@repo/shared';

export type { OrganizationMembershipRole, OrganizationMembershipStatus };

export type OrganizationMembershipEntity = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
  createdAt: Date;
  updatedAt: Date;
};
