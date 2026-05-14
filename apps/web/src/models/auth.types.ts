import type {
  AuthActionSuccessResponse,
  AuthSuccessResponse,
  AuthUser,
  AuthUserSuccessResponse,
  LoginRequest,
  RegisterRequest,
} from '@repo/shared';

export type {
  AuthActionSuccessResponse,
  AuthSuccessResponse,
  AuthUser,
  AuthUserSuccessResponse,
  LoginRequest,
  RegisterRequest,
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};
