import type { OrganizationEntity } from './model';
import type { OrganizationDto } from '@repo/shared';

export function toOrganizationDto(
  organization: OrganizationEntity,
): OrganizationDto {
  return {
    id: organization.id,
    name: organization.name,
    status: organization.status,
  };
}
