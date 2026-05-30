import type { UserEntity } from './model';
import type { AuthUserDto, UserListItemDto } from '@repo/shared';

export function toAuthUserDto(user: UserEntity): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    isSuperAdmin: user.isSuperAdmin,
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
