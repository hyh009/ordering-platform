import type {
  Organization,
  OrganizationDto,
  OrganizationListItem,
  OrganizationListItemDto,
} from './types';

export const organizationModel = {
  deserializeListItem(dto: OrganizationListItemDto): OrganizationListItem {
    return {
      id: dto.id,
      name: dto.name,
      domain: dto.domain,
      reviewStatus: dto.reviewStatus,
      status: dto.status,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  },

  deserialize(dto: OrganizationDto): Organization {
    return {
      address: dto.address,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      id: dto.id,
      name: dto.name,
      domain: dto.domain,
      reviewStatus: dto.reviewStatus,
      status: dto.status,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  },
};
