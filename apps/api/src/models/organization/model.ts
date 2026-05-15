export { organizationStatuses } from '@repo/shared';

import type { OrganizationDto, OrganizationStatus } from '@repo/shared';

export type { OrganizationStatus };

export type OrganizationEntity = {
  id: string;
  name: string;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
};

export function toOrganizationDto(
  organization: OrganizationEntity,
): OrganizationDto {
  return {
    id: organization.id,
    name: organization.name,
    status: organization.status,
  };
}
