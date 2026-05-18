import type { UserEntity } from './model';
import type { AuthUserDto } from '@repo/shared';

export function toAuthUserDto(user: UserEntity): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    isSuperAdmin: user.isSuperAdmin,
  };
}
