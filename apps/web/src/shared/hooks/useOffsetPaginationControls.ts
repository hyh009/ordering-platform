import { useCallback } from 'react';
import {
  getNextOffset,
  getOffsetForPage,
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

/**
 * @reusable
 * @description Drive offset pagination (page numbers, single-step prev/next, rows-per-page) with one loadPage callback.
 * @keywords pagination, offset, page, go to page, next, previous, rows per page
 */
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

    await loadPage({ limit, offset: getPreviousOffset({ limit, offset, total }) });
  }, [hasPreviousPage, limit, loadPage, offset, total]);

  const nextPage = useCallback(async () => {
    if (!hasNextPage) {
      return;
    }

    await loadPage({ limit, offset: getNextOffset({ limit, offset, total }) });
  }, [hasNextPage, limit, loadPage, offset, total]);

  const goToPage = useCallback(
    async (targetPage: number) => {
      const clampedPage = Math.min(Math.max(1, targetPage), totalPages);

      if (clampedPage === page) {
        return;
      }

      await loadPage({
        limit,
        offset: getOffsetForPage({ limit, page: clampedPage }),
      });
    },
    [limit, loadPage, page, totalPages],
  );

  const changeLimit = useCallback(
    async (nextLimit: number) => {
      // Changing the page size always resets back to the first page.
      await loadPage({ limit: nextLimit, offset: 0 });
    },
    [loadPage],
  );

  return {
    changeLimit,
    goToPage,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    page,
    previousPage,
    totalPages,
  };
}
