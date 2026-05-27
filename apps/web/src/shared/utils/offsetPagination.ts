import type { OffsetPaginationDto } from '@repo/shared';

export type OffsetPagination = OffsetPaginationDto;

export type OffsetPageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  totalPages: number;
};

function getSafeLimit(limit: number) {
  return Number.isFinite(limit) && limit > 0 ? limit : 1;
}

/**
 * @reusable
 * @description Read offset pagination page state from total, limit, and offset values.
 * @keywords pagination, offset, page info, total pages, has next
 */
export function getOffsetPageInfo(
  pagination: OffsetPagination,
): OffsetPageInfo {
  const limit = getSafeLimit(pagination.limit);
  const offset = Math.max(0, pagination.offset);
  const total = Math.max(0, pagination.total);
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    hasNextPage: page < totalPages,
    hasPreviousPage: offset > 0,
    page,
    totalPages,
  };
}

/**
 * @reusable
 * @description Compute the next offset for offset pagination.
 * @keywords pagination, offset, next page, next offset
 */
export function getNextOffset(pagination: OffsetPagination) {
  return Math.max(0, pagination.offset) + getSafeLimit(pagination.limit);
}

/**
 * @reusable
 * @description Compute the previous offset for offset pagination.
 * @keywords pagination, offset, previous page, previous offset
 */
export function getPreviousOffset(pagination: OffsetPagination) {
  return Math.max(
    0,
    Math.max(0, pagination.offset) - getSafeLimit(pagination.limit),
  );
}
