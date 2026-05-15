import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';

export const organizationStatuses = ['active', 'disabled'] as const;
export const organizationMembershipRoles = [
  'org_owner',
  'org_admin',
  'staff',
] as const;
export const organizationMembershipStatuses = ['active', 'disabled'] as const;

export type OrganizationStatus = (typeof organizationStatuses)[number];
export type OrganizationMembershipRole =
  (typeof organizationMembershipRoles)[number];
export type OrganizationMembershipStatus =
  (typeof organizationMembershipStatuses)[number];

export type OrganizationDto = {
  id: string;
  name: string;
  status: OrganizationStatus;
};

export type OrganizationMembershipDto = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
};

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  ownerUserId: z.string().trim().min(1),
});

export type CreateOrganizationRequest = z.infer<
  typeof createOrganizationSchema
>;

export type CreateOrganizationSuccessResponse = ApiSuccessResponse<{
  organization: OrganizationDto;
  ownerMembership: OrganizationMembershipDto;
}>;
