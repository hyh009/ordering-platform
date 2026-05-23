import { z } from 'zod';

import type { ApiSuccessResponse, OffsetPaginationDto } from './api.js';

export const organizationStatuses = ['active', 'disabled'] as const;
export const organizationReviewStatuses = [
  'pending',
  'approved',
  'rejected',
] as const;
export const organizationMembershipRoles = [
  'org_owner',
  'org_admin',
  'staff',
] as const;
export const organizationMembershipStatuses = ['active', 'disabled'] as const;

export type OrganizationStatus = (typeof organizationStatuses)[number];
export type OrganizationReviewStatus =
  (typeof organizationReviewStatuses)[number];
export type OrganizationMembershipRole =
  (typeof organizationMembershipRoles)[number];
export type OrganizationMembershipStatus =
  (typeof organizationMembershipStatuses)[number];

export type OrganizationAddressDto = {
  country?: string | undefined;
  postalCode?: string | undefined;
  city?: string | undefined;
  district?: string | undefined;
  line1?: string | undefined;
  line2?: string | undefined;
};

export type OrganizationDto = {
  id: string;
  name: string;
  domain?: string;
  status: OrganizationStatus;
  reviewStatus: OrganizationReviewStatus;
  contactEmail?: string;
  contactPhone?: string;
  address?: OrganizationAddressDto;
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

const organizationOptionalTextSchema = z.string().trim().min(1).max(120);

export const organizationAddressSchema = z
  .object({
    country: organizationOptionalTextSchema.optional(),
    postalCode: organizationOptionalTextSchema.optional(),
    city: organizationOptionalTextSchema.optional(),
    district: organizationOptionalTextSchema.optional(),
    line1: z.string().trim().min(1).max(240).optional(),
    line2: z.string().trim().min(1).max(240).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one address field is required',
  });

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  domain: z.string().trim().min(1).max(120).optional(),
  ownerUserId: z.string().trim().min(1),
  contactEmail: z.email().trim().toLowerCase().optional(),
  contactPhone: organizationOptionalTextSchema.optional(),
  address: organizationAddressSchema.optional(),
});

export const listOrganizationsQuerySchema = z
  .object({
    offset: paginationNumberSchema(z.number().int().min(0))
      .optional()
      .default(0),
    limit: paginationNumberSchema(z.number().int().min(1).max(100))
      .optional()
      .default(20),
    keyword: z.string().trim().optional(),
    status: z.enum(organizationStatuses).optional(),
    sortBy: z.enum(['name', 'createdAt']).optional().default('createdAt'),
    sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .optional()
  .default({
    offset: 0,
    limit: 20,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    domain: z.string().trim().min(1).max(120).optional(),
    status: z.enum(organizationStatuses).optional(),
    reviewStatus: z.enum(organizationReviewStatuses).optional(),
    contactEmail: z.email().trim().toLowerCase().nullable().optional(),
    contactPhone: organizationOptionalTextSchema.nullable().optional(),
    address: organizationAddressSchema.nullable().optional(),
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
  pagination: OffsetPaginationDto;
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
