import type { Organization, OrganizationDto } from './organization.types';

export const organizationModel = {
  deserialize(dto: OrganizationDto): Organization {
    return {
      id: dto.id,
      name: dto.name,
      status: dto.status,
    };
  },
};
