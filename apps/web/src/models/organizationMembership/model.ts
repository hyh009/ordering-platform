import type { OrganizationMembership, OrganizationMembershipWithUserDto } from './types';

export const organizationMembershipModel = {
  deserialize(dto: OrganizationMembershipWithUserDto): OrganizationMembership {
    return {
      id: dto.id,
      organizationId: dto.organizationId,
      userId: dto.userId,
      role: dto.role,
      status: dto.status,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      userEmail: dto.userEmail,
      userUsername: dto.userUsername,
    };
  },
};
