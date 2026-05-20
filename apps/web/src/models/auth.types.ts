import type {
  AuthActionSuccessResponse,
  AuthSuccessResponse,
  AuthUserDto,
  AuthUserSuccessResponse,
  LoginRequest,
} from '@repo/shared';

export type {
  AuthActionSuccessResponse,
  AuthSuccessResponse,
  AuthUserDto,
  AuthUserSuccessResponse,
  LoginRequest,
};

export type AuthSession = {
  accessToken: string;
  user: AuthUserDto;
};
