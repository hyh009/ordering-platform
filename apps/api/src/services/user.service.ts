import { toUserListItemDto } from '@src/models/user/mapper';
import { UserMongoModel } from '@src/models/user/mongo';

import type { ListUsersQuery, ListUsersSuccessResponse } from '@repo/shared';
import type { UserEntity } from '@src/models/user/model';
import type { FilterQuery } from 'mongoose';

export class UserService {
  public async listUsers(
    query: ListUsersQuery,
  ): Promise<ListUsersSuccessResponse['data']> {
    const mongoQuery: FilterQuery<UserEntity> = {
      status: 'active',
    };

    if (query.keyword) {
      const keywordRegex = new RegExp(
        query.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      mongoQuery.$or = [{ email: keywordRegex }, { username: keywordRegex }];
    }

    const [users, total] = await Promise.all([
      UserMongoModel.find(mongoQuery)
        .sort({ createdAt: -1 })
        .skip(query.offset)
        .limit(query.limit)
        .lean(),
      UserMongoModel.countDocuments(mongoQuery),
    ]);

    return {
      users: users.map((user) => toUserListItemDto(user as UserEntity)),
      pagination: {
        offset: query.offset,
        limit: query.limit,
        total,
      },
    };
  }
}

export function createUserService() {
  return new UserService();
}

export const userService = createUserService();
