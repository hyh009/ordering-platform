import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type OffsetPaginationQueryParams = {
  page: number;
  pageSize: number;
};

export type OffsetPaginationLoadedResult<TItem> = {
  status: 'loaded';
  items: TItem[];
  totalItems: number;
};

export type OffsetPaginationFailedResult<TFailureReason> = {
  status: 'failed';
  reason: TFailureReason;
};

export type OffsetPaginationQueryResult<TItem, TFailureReason> =
  | OffsetPaginationLoadedResult<TItem>
  | OffsetPaginationFailedResult<TFailureReason>;

export type UseOffsetPaginationQueryOptions<TItem, TFailureReason> = {
  initialPage?: number;
  pageSize: number;
  autoLoad?: boolean;
  query: (
    params: OffsetPaginationQueryParams,
  ) => Promise<OffsetPaginationQueryResult<TItem, TFailureReason>>;
};

export function useOffsetPaginationQuery<TItem, TFailureReason = unknown>({
  autoLoad = true,
  initialPage = 1,
  pageSize: initialPageSize,
  query,
}: UseOffsetPaginationQueryOptions<TItem, TFailureReason>) {
  const [items, setItems] = useState<TItem[]>([]);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [failureReason, setFailureReason] = useState<TFailureReason | null>(
    null,
  );
  const requestIdRef = useRef(0);

  const loadPage = useCallback(
    async function loadPage(nextPage: number) {
      const requestId = requestIdRef.current + 1;

      requestIdRef.current = requestId;
      setIsLoading(true);
      setFailureReason(null);

      let result: OffsetPaginationQueryResult<TItem, TFailureReason>;

      try {
        result = await query({
          page: nextPage,
          pageSize,
        });
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }

        throw error;
      }

      if (requestId !== requestIdRef.current) {
        return result;
      }

      setIsLoading(false);

      if (result.status === 'failed') {
        setFailureReason(result.reason);
        return result;
      }

      setItems(result.items);
      setPage(nextPage);
      setTotalItems(result.totalItems);

      return result;
    },
    [pageSize, query],
  );

  const reload = useCallback(async () => loadPage(page), [loadPage, page]);

  const setPageSize = useCallback(
    async function setPageSize(nextPageSize: number) {
      const requestId = requestIdRef.current + 1;

      requestIdRef.current = requestId;
      setPageSizeState(nextPageSize);
      setIsLoading(true);
      setFailureReason(null);

      let result: OffsetPaginationQueryResult<TItem, TFailureReason>;

      try {
        result = await query({
          page: initialPage,
          pageSize: nextPageSize,
        });
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }

        throw error;
      }

      if (requestId !== requestIdRef.current) {
        return result;
      }

      setIsLoading(false);

      if (result.status === 'failed') {
        setFailureReason(result.reason);
        return result;
      }

      setItems(result.items);
      setPage(initialPage);
      setTotalItems(result.totalItems);

      return result;
    },
    [initialPage, query],
  );

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  const nextPage = useCallback(async () => {
    if (!hasNextPage) {
      return;
    }

    return loadPage(page + 1);
  }, [hasNextPage, loadPage, page]);

  const previousPage = useCallback(async () => {
    if (!hasPreviousPage) {
      return;
    }

    return loadPage(page - 1);
  }, [hasPreviousPage, loadPage, page]);

  const reset = useCallback(
    async () => loadPage(initialPage),
    [initialPage, loadPage],
  );

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadPage(initialPage);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoLoad, initialPage, loadPage]);

  return useMemo(
    () => ({
      failureReason,
      hasNextPage,
      hasPreviousPage,
      isLoading,
      items,
      loadPage,
      nextPage,
      page,
      pageSize,
      previousPage,
      reload,
      reset,
      setPageSize,
      totalItems,
      totalPages,
    }),
    [
      failureReason,
      hasNextPage,
      hasPreviousPage,
      isLoading,
      items,
      loadPage,
      nextPage,
      page,
      pageSize,
      previousPage,
      reload,
      reset,
      setPageSize,
      totalItems,
      totalPages,
    ],
  );
}
