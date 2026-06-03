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
 * @description Compute the offset for a 1-based page number.
 * @keywords pagination, offset, go to page, page jump
 */
export function getOffsetForPage({
  limit,
  page,
}: {
  limit: number;
  page: number;
}) {
  const safeLimit = getSafeLimit(limit);
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  return (safePage - 1) * safeLimit;
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

export type PageNumberWindow = {
  pages: number[];
  hasPreviousWindow: boolean;
  hasNextWindow: boolean;
  previousWindowPage: number;
  nextWindowPage: number;
};

/**
 * @reusable
 * @description Build a fixed-size window of page numbers around the current page.
 * @keywords pagination, page numbers, window, batch, page bar
 */
export function getPageNumberWindow({
  page,
  totalPages,
  windowSize = 10,
}: {
  page: number;
  totalPages: number;
  windowSize?: number;
}): PageNumberWindow {
  const safeTotalPages = Math.max(1, Math.floor(totalPages));
  const safeWindow = Math.max(1, Math.floor(windowSize));
  const safePage = Math.min(
    safeTotalPages,
    Math.max(1, Math.floor(page) || 1),
  );

  const windowIndex = Math.floor((safePage - 1) / safeWindow);
  const start = windowIndex * safeWindow + 1;
  const end = Math.min(start + safeWindow - 1, safeTotalPages);

  const pages: number[] = [];
  for (let value = start; value <= end; value += 1) {
    pages.push(value);
  }

  return {
    pages,
    hasPreviousWindow: start > 1,
    hasNextWindow: end < safeTotalPages,
    // Previous arrow jumps to the first page of the previous window.
    previousWindowPage: Math.max(1, start - safeWindow),
    // Next arrow jumps to the first page of the next window.
    nextWindowPage: Math.min(safeTotalPages, end + 1),
  };
}
