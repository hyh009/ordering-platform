import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';
import type { OrganizationMembershipRole } from './organization.js';

export const userStatuses = ['active', 'disabled'] as const;

export type UserStatus = (typeof userStatuses)[number];

export type UserOrgMembershipDto = {
  organizationId: string;
  organizationName: string;
  role: OrganizationMembershipRole;
};

export type AuthUserDto = {
  id: string;
  email: string;
  username: string;
  isSuperAdmin: boolean;
  memberships: UserOrgMembershipDto[];
};

export const passwordRuleMessage =
  'Password must be 8-128 characters and include uppercase, lowercase, and a number';

export const passwordSchema = z
  .string()
  .min(8, passwordRuleMessage)
  .max(128, passwordRuleMessage)
  .regex(/[a-z]/, passwordRuleMessage)
  .regex(/[A-Z]/, passwordRuleMessage)
  .regex(/[0-9]/, passwordRuleMessage);

export const registerSchema = z.object({
  email: z.email().trim().toLowerCase(),
  username: z.string().trim().min(1).max(60),
  password: passwordSchema,
});

export type RegisterRequest = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export type AuthSuccessResponse = ApiSuccessResponse<{
  user: AuthUserDto;
  accessToken: string;
}>;

export type AuthUserSuccessResponse = ApiSuccessResponse<{
  user: AuthUserDto;
}>;

export type AuthActionSuccessResponse = ApiSuccessResponse<{
  ok: true;
}>;
