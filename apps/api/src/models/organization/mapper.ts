import {
  organizationAddressSchema,
  organizationPhoneSchema,
} from '@repo/shared';

import type { OrganizationEntity } from './model';
import type { OrganizationDto, OrganizationListItemDto } from '@repo/shared';

export function toOrganizationListItemDto(
  organization: OrganizationEntity,
): OrganizationListItemDto {
  return {
    id: organization.id,
    name: organization.name,
    ...(organization.domain ? { domain: organization.domain } : {}),
    status: organization.status,
    reviewStatus: organization.reviewStatus,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

export function toOrganizationDto(
  organization: OrganizationEntity,
): OrganizationDto {
  const contactPhone = organizationPhoneSchema.safeParse(
    organization.contactPhone,
  );
  const address = organizationAddressSchema.safeParse(organization.address);

  return {
    ...toOrganizationListItemDto(organization),
    ...(organization.contactEmail
      ? { contactEmail: organization.contactEmail }
      : {}),
    ...(contactPhone.success ? { contactPhone: contactPhone.data } : {}),
    ...(address.success ? { address: address.data } : {}),
  };
}
