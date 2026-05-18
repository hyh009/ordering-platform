import type { OrganizationMembershipEntity } from './model';
import type { OrganizationMembershipDto } from '@repo/shared';

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
