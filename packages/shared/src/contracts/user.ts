import { z } from 'zod';

import type { ApiSuccessResponse, OffsetPaginationDto } from './api.js';
import { userStatuses } from './auth.js';

export type UserListItemDto = {
  id: string;
  email: string;
  username: string;
  status: (typeof userStatuses)[number];
};

function paginationNumberSchema(schema: z.ZodNumber) {
  return z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    schema,
  );
}

export const listUsersQuerySchema = z
  .object({
    offset: paginationNumberSchema(z.number().int().min(0))
      .optional()
      .default(0),
    limit: paginationNumberSchema(z.number().int().min(1).max(100))
      .optional()
      .default(20),
    keyword: z.string().trim().optional(),
  })
  .optional()
  .default({
    offset: 0,
    limit: 20,
  });

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export type ListUsersSuccessResponse = ApiSuccessResponse<{
  users: UserListItemDto[];
  pagination: OffsetPaginationDto;
}>;
