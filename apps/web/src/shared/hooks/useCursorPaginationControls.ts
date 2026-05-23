import { useCallback } from 'react';
import {
  getCursorPageInfo,
  type CursorPagination,
} from '@/shared/utils/cursorPagination';

export type UseCursorPaginationControlsOptions<
  TPagination extends CursorPagination,
> = {
  loadNextPage: (pagination: TPagination) => Promise<void> | void;
  pagination: TPagination;
};

export function useCursorPaginationControls<
  TPagination extends CursorPagination,
>({
  loadNextPage,
  pagination,
}: UseCursorPaginationControlsOptions<TPagination>) {
  const { hasNextPage } = getCursorPageInfo(pagination);

  const nextPage = useCallback(async () => {
    if (!hasNextPage) {
      return;
    }

    await loadNextPage(pagination);
  }, [hasNextPage, loadNextPage, pagination]);

  return {
    hasNextPage,
    nextPage,
  };
}
