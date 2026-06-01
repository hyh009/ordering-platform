import type { UserEntity } from './model';
import type { AuthUserDto, UserListItemDto, UserOrgMembershipDto } from '@repo/shared';

export function toAuthUserDto(
  user: UserEntity,
  memberships: UserOrgMembershipDto[],
): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    isSuperAdmin: user.isSuperAdmin,
    memberships,
  };
}

export function toUserListItemDto(user: UserEntity): UserListItemDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    status: user.status,
  };
}
