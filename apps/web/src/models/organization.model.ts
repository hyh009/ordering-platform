import type { Organization, OrganizationDto } from './organization.types';

export const organizationModel = {
  deserialize(dto: OrganizationDto): Organization {
    return {
      address: dto.address,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      id: dto.id,
      name: dto.name,
      reviewStatus: dto.reviewStatus,
      status: dto.status,
    };
  },
};
