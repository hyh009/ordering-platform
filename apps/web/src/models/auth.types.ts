import type {
  AuthActionSuccessResponse,
  AuthSuccessResponse,
  AuthUserDto,
  AuthUserSuccessResponse,
  LoginRequest,
  RegisterRequest,
} from '@repo/shared';

export type {
  AuthActionSuccessResponse,
  AuthSuccessResponse,
  AuthUserDto,
  AuthUserSuccessResponse,
  LoginRequest,
  RegisterRequest,
};

export type AuthSession = {
  accessToken: string;
  user: AuthUserDto;
};
