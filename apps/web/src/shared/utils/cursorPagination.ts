export type CursorPagination = {
  nextCursor: string | null;
};

export type CursorPageInfo = {
  hasNextPage: boolean;
};

/**
 * @reusable
 * @description Read cursor pagination page state from a nextCursor value.
 * @keywords pagination, cursor, page info, next cursor, has next
 */
export function getCursorPageInfo(
  pagination: CursorPagination,
): CursorPageInfo {
  return {
    hasNextPage: pagination.nextCursor !== null,
  };
}
