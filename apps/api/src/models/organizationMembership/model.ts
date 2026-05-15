export {
  organizationMembershipRoles,
  organizationMembershipStatuses,
} from '@repo/shared';

import type {
  OrganizationMembershipDto,
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

export function toOrganizationMembershipDto(
  membership: OrganizationMembershipEntity,
): OrganizationMembershipDto {
  return {
    id: membership.id,
    organizationId: membership.organizationId,
    userId: membership.userId,
    role: membership.role,
    status: membership.status,
  };
}
