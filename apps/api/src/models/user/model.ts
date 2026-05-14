export { userRoles, userStatuses } from '@repo/shared';

import type { UserRole, UserStatus } from '@repo/shared';

export type UserEntity = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  roles: UserRole[];
  status: UserStatus;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  roles: UserRole[];
};

export function toPublicUser(user: UserEntity): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    roles: [...user.roles],
  };
}
