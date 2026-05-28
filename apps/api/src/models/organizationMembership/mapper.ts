import type { OrganizationMembershipEntity } from './model';
import type {
  OrganizationMembershipDto,
  OrganizationMembershipWithUserDto,
} from '@repo/shared';

export function toOrganizationMembershipDto(
  membership: OrganizationMembershipEntity,
): OrganizationMembershipDto {
  return {
    id: membership.id,
    organizationId: membership.organizationId,
    userId: membership.userId,
    role: membership.role,
    status: membership.status,
    createdAt: membership.createdAt.toISOString(),
    updatedAt: membership.updatedAt.toISOString(),
  };
}

export function toOrganizationMembershipWithUserDto(
  membership: OrganizationMembershipEntity,
  user: { email: string; username: string },
): OrganizationMembershipWithUserDto {
  return {
    ...toOrganizationMembershipDto(membership),
    userEmail: user.email,
    userUsername: user.username,
  };
}
