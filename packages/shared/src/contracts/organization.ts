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

function paginationNumberSchema(schema: z.ZodNumber) {
  return z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    schema,
  );
}

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  ownerUserId: z.string().trim().min(1),
});

export const listOrganizationsQuerySchema = z
  .object({
    offset: paginationNumberSchema(z.number().int().min(0))
      .optional()
      .default(0),
    limit: paginationNumberSchema(z.number().int().min(1).max(100))
      .optional()
      .default(20),
  })
  .optional()
  .default({ offset: 0, limit: 20 });

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    status: z.enum(organizationStatuses).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const organizationParamsSchema = z.object({
  organizationId: z.string().trim().min(1),
});

export type CreateOrganizationRequest = z.infer<
  typeof createOrganizationSchema
>;

export type UpdateOrganizationRequest = z.infer<
  typeof updateOrganizationSchema
>;

export type OrganizationParams = z.infer<typeof organizationParamsSchema>;

export type ListOrganizationsQuery = z.infer<
  typeof listOrganizationsQuerySchema
>;

export type ListOrganizationsSuccessResponse = ApiSuccessResponse<{
  organizations: OrganizationDto[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}>;

export type GetOrganizationSuccessResponse = ApiSuccessResponse<{
  organization: OrganizationDto;
}>;

export type CreateOrganizationSuccessResponse = ApiSuccessResponse<{
  organization: OrganizationDto;
  ownerMembership: OrganizationMembershipDto;
}>;

export type UpdateOrganizationSuccessResponse = ApiSuccessResponse<{
  organization: OrganizationDto;
}>;
