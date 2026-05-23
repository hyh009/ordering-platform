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

export function getNextOffset(pagination: OffsetPagination) {
  return Math.max(0, pagination.offset) + getSafeLimit(pagination.limit);
}

export function getPreviousOffset(pagination: OffsetPagination) {
  return Math.max(
    0,
    Math.max(0, pagination.offset) - getSafeLimit(pagination.limit),
  );
}
