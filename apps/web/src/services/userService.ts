import { apiJson } from '@/api';
import { userPaths } from '@/api/paths/user.paths';
import { userModel } from '@/models/user';
import type { ListUsersSuccessResponse } from '@/models/user';

export const userService = {
  async listUsers(input: { limit: number; offset: number; keyword?: string }) {
    const params = new URLSearchParams({
      limit: String(input.limit),
      offset: String(input.offset),
    });

    if (input.keyword) {
      params.append('keyword', input.keyword);
    }

    const response = await apiJson<ListUsersSuccessResponse>(
      `${userPaths.list}?${params.toString()}`,
    );

    return {
      users: response.data.users.map(userModel.deserializeListItem),
      pagination: response.data.pagination,
    };
  },
};
