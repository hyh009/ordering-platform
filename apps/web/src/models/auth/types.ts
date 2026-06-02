import type {
  AuthActionSuccessResponse,
  AuthSuccessResponse,
  AuthUserDto,
  AuthUserSuccessResponse,
  LoginRequest,
  UserOrgMembershipDto,
} from '@repo/shared';

export type {
  AuthActionSuccessResponse,
  AuthSuccessResponse,
  AuthUserDto,
  AuthUserSuccessResponse,
  LoginRequest,
  UserOrgMembershipDto,
};

export type AuthSession = {
  accessToken: string;
  user: AuthUserDto;
};
