export { organizationReviewStatuses, organizationStatuses } from '@repo/shared';

import type {
  OrganizationAddressDto,
  OrganizationPhoneDto,
  OrganizationReviewStatus,
  OrganizationStatus,
} from '@repo/shared';

export type { OrganizationReviewStatus, OrganizationStatus };

export type OrganizationAddressEntity = OrganizationAddressDto;
export type OrganizationPhoneEntity = OrganizationPhoneDto;

export type OrganizationEntity = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  reviewStatus: OrganizationReviewStatus;
  contactEmail: string;
  contactPhone: OrganizationPhoneEntity;
  address: OrganizationAddressEntity;
  createdAt: Date;
  updatedAt: Date;
};
