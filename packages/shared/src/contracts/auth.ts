import { z } from 'zod';

import type { ApiSuccessResponse } from './api.js';

export const userRoles = ['user', 'admin'] as const;
export const userStatuses = ['active', 'disabled'] as const;

export type UserRole = (typeof userRoles)[number];
export type UserStatus = (typeof userStatuses)[number];

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  roles: UserRole[];
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
  user: AuthUser;
  accessToken: string;
}>;

export type AuthUserSuccessResponse = ApiSuccessResponse<{
  user: AuthUser;
}>;

export type AuthActionSuccessResponse = ApiSuccessResponse<{
  ok: true;
}>;
