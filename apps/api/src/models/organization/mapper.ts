import type { OrganizationEntity } from './model';
import type { OrganizationDto } from '@repo/shared';

export function toOrganizationDto(
  organization: OrganizationEntity,
): OrganizationDto {
  return {
    id: organization.id,
    name: organization.name,
    status: organization.status,
    reviewStatus: organization.reviewStatus,
    ...(organization.contactEmail
      ? { contactEmail: organization.contactEmail }
      : {}),
    ...(organization.contactPhone
      ? { contactPhone: organization.contactPhone }
      : {}),
    ...(organization.address ? { address: organization.address } : {}),
  };
}
