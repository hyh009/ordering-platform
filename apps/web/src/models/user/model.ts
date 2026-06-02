import type { UserListItemDto } from '@repo/shared';
import type { UserListItem } from './types';

export const userModel = {
  deserializeListItem(dto: UserListItemDto): UserListItem {
    return {
      id: dto.id,
      email: dto.email,
      username: dto.username,
      status: dto.status,
    };
  },
};
