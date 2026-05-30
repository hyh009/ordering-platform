import type { OrganizationEntity } from './model';
import type { OrganizationDto, OrganizationListItemDto } from '@repo/shared';

export function toOrganizationListItemDto(
  organization: OrganizationEntity,
): OrganizationListItemDto {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    reviewStatus: organization.reviewStatus,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

export function toOrganizationDto(
  organization: OrganizationEntity,
): OrganizationDto {
  return {
    ...toOrganizationListItemDto(organization),
    contactEmail: organization.contactEmail,
    contactPhone: organization.contactPhone,
    address: organization.address,
  };
}
