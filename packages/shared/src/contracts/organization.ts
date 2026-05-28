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

export const organizationAddressCountryCodes = ['TW'] as const;
export const organizationPhoneCountryCodes = ['TW'] as const;
export const organizationPhoneTypes = [
  'mobile',
  'landline',
  'toll_free',
] as const;

export type OrganizationAddressCountryCode =
  (typeof organizationAddressCountryCodes)[number];
export type OrganizationPhoneCountryCode =
  (typeof organizationPhoneCountryCodes)[number];
export type OrganizationPhoneType = (typeof organizationPhoneTypes)[number];

export type OrganizationAddressDto = {
  countryCode: 'TW';
  schemaVersion: 1;
  formatted: string;
  tw: {
    postalCode?: string | undefined;
    city: string;
    district: string;
    streetAddress: string;
  };
};

export type OrganizationPhoneDto = {
  countryCode: 'TW';
  e164: string;
  nationalNumber: string;
  type: OrganizationPhoneType;
  extension?: string | undefined;
};

export type OrganizationListItemDto = {
  id: string;
  name: string;
  domain?: string;
  status: OrganizationStatus;
  reviewStatus: OrganizationReviewStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationDto = OrganizationListItemDto & {
  contactEmail?: string;
  contactPhone?: OrganizationPhoneDto;
  address?: OrganizationAddressDto;
};

export type OrganizationMembershipDto = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMembershipWithUserDto = OrganizationMembershipDto & {
  userEmail: string;
  userUsername: string;
};

function paginationNumberSchema(schema: z.ZodNumber) {
  return z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    schema,
  );
}

const organizationOptionalTextSchema = z.string().trim().min(1).max(120);
const taiwanPostalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{3}(\d{2,3})?$/, 'Invalid Taiwan postal code');
const taiwanPhoneNationalNumberSchema = z
  .string()
  .trim()
  .regex(/^0\d{7,9}$/, 'Invalid Taiwan phone number');
const taiwanPhoneExtensionSchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}$/, 'Invalid phone extension');

function normalizeTaiwanPhoneNumber(value: string) {
  return value.replace(/[^\d]/g, '');
}

function toTaiwanE164(nationalNumber: string) {
  return `+886${nationalNumber.slice(1)}`;
}

export const organizationTaiwanAddressSchema = z
  .object({
    countryCode: z.literal('TW'),
    schemaVersion: z.literal(1),
    formatted: z.string().trim().min(1).max(360),
    tw: z.object({
      postalCode: taiwanPostalCodeSchema.optional(),
      city: organizationOptionalTextSchema,
      district: organizationOptionalTextSchema,
      streetAddress: z.string().trim().min(1).max(240),
    }),
  })
  .superRefine((value, ctx) => {
    const expectedFormatted = [
      value.tw.postalCode,
      value.tw.city,
      value.tw.district,
      value.tw.streetAddress,
    ]
      .filter(Boolean)
      .join('');

    if (value.formatted !== expectedFormatted) {
      ctx.addIssue({
        code: 'custom',
        message: 'Taiwan address formatted value does not match address fields',
        path: ['formatted'],
      });
    }
  });

export const organizationAddressSchema = organizationTaiwanAddressSchema;

export const organizationTaiwanPhoneSchema = z
  .object({
    countryCode: z.literal('TW'),
    e164: z
      .string()
      .trim()
      .regex(/^\+886\d{7,9}$/, 'Invalid E.164 phone number'),
    nationalNumber: z.preprocess(
      (value) =>
        typeof value === 'string' ? normalizeTaiwanPhoneNumber(value) : value,
      taiwanPhoneNationalNumberSchema,
    ),
    type: z.enum(organizationPhoneTypes),
    extension: taiwanPhoneExtensionSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.e164 !== toTaiwanE164(value.nationalNumber)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Taiwan phone E.164 value does not match national number',
        path: ['e164'],
      });
    }
  });

export const organizationPhoneSchema = organizationTaiwanPhoneSchema;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  domain: z.string().trim().min(1).max(120).optional(),
  ownerUserId: z.string().trim().min(1),
  contactEmail: z.email().trim().toLowerCase().optional(),
  contactPhone: organizationPhoneSchema.optional(),
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
    sortBy: z
      .enum(['name', 'createdAt', 'updatedAt'])
      .optional()
      .default('createdAt'),
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
    contactPhone: organizationPhoneSchema.nullable().optional(),
    address: organizationAddressSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const organizationParamsSchema = z.object({
  organizationId: z.string().trim().min(1),
});

export const listOrganizationMembershipsQuerySchema = z
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

export const createOrganizationMembershipSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(organizationMembershipRoles),
});

export const updateOrganizationMembershipSchema = z
  .object({
    role: z.enum(organizationMembershipRoles).optional(),
    status: z.enum(organizationMembershipStatuses).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const organizationMembershipParamsSchema = z.object({
  organizationId: z.string().trim().min(1),
  membershipId: z.string().trim().min(1),
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

export type ListOrganizationMembershipsQuery = z.infer<
  typeof listOrganizationMembershipsQuerySchema
>;

export type CreateOrganizationMembershipRequest = z.infer<
  typeof createOrganizationMembershipSchema
>;

export type UpdateOrganizationMembershipRequest = z.infer<
  typeof updateOrganizationMembershipSchema
>;

export type OrganizationMembershipParams = z.infer<
  typeof organizationMembershipParamsSchema
>;

export type ListOrganizationsSuccessResponse = ApiSuccessResponse<{
  organizations: OrganizationListItemDto[];
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

export type ListOrganizationMembershipsSuccessResponse = ApiSuccessResponse<{
  memberships: OrganizationMembershipWithUserDto[];
  pagination: OffsetPaginationDto;
}>;

export type CreateOrganizationMembershipSuccessResponse = ApiSuccessResponse<{
  membership: OrganizationMembershipWithUserDto;
}>;

export type UpdateOrganizationMembershipSuccessResponse = ApiSuccessResponse<{
  membership: OrganizationMembershipWithUserDto;
}>;
