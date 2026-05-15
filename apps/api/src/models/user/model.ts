export { userStatuses } from '@repo/shared';

import type { UserStatus } from '@repo/shared';

export type { UserStatus };

export type UserEntity = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  isSuperAdmin: boolean;
  status: UserStatus;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  isSuperAdmin: boolean;
};

export function toPublicUser(user: UserEntity): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    isSuperAdmin: user.isSuperAdmin,
  };
}
