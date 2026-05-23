export type CursorPagination = {
  nextCursor: string | null;
};

export type CursorPageInfo = {
  hasNextPage: boolean;
};

export function getCursorPageInfo(
  pagination: CursorPagination,
): CursorPageInfo {
  return {
    hasNextPage: pagination.nextCursor !== null,
  };
}
