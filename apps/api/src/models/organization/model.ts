export { organizationStatuses } from '@repo/shared';

import type { OrganizationStatus } from '@repo/shared';

export type { OrganizationStatus };

export type OrganizationEntity = {
  id: string;
  name: string;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
};
