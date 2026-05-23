import { useCallback } from 'react';
import {
  getNextOffset,
  getOffsetPageInfo,
  getPreviousOffset,
  type OffsetPagination,
} from '@/shared/utils/offsetPagination';

export type OffsetPaginationLoadPageInput = {
  limit: number;
  offset: number;
};

export type UseOffsetPaginationControlsOptions = {
  loadPage: (input: OffsetPaginationLoadPageInput) => Promise<void> | void;
  pagination: OffsetPagination;
};

export function useOffsetPaginationControls({
  loadPage,
  pagination,
}: UseOffsetPaginationControlsOptions) {
  const { hasNextPage, hasPreviousPage, page, totalPages } =
    getOffsetPageInfo(pagination);
  const { limit, offset, total } = pagination;

  const previousPage = useCallback(async () => {
    if (!hasPreviousPage) {
      return;
    }

    await loadPage({
      limit,
      offset: getPreviousOffset({
        limit,
        offset,
        total,
      }),
    });
  }, [hasPreviousPage, limit, loadPage, offset, total]);

  const nextPage = useCallback(async () => {
    if (!hasNextPage) {
      return;
    }

    await loadPage({
      limit,
      offset: getNextOffset({
        limit,
        offset,
        total,
      }),
    });
  }, [hasNextPage, limit, loadPage, offset, total]);

  return {
    hasNextPage,
    hasPreviousPage,
    nextPage,
    page,
    previousPage,
    totalPages,
  };
}
