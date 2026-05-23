export { organizationReviewStatuses, organizationStatuses } from '@repo/shared';

import type {
  OrganizationReviewStatus,
  OrganizationStatus,
} from '@repo/shared';

export type { OrganizationReviewStatus, OrganizationStatus };

export type OrganizationAddressEntity = {
  country?: string | undefined;
  postalCode?: string | undefined;
  city?: string | undefined;
  district?: string | undefined;
  line1?: string | undefined;
  line2?: string | undefined;
};

export type OrganizationEntity = {
  id: string;
  name: string;
  domain?: string;
  status: OrganizationStatus;
  reviewStatus: OrganizationReviewStatus;
  contactEmail?: string;
  contactPhone?: string;
  address?: OrganizationAddressEntity;
  createdAt: Date;
  updatedAt: Date;
};
