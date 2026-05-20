import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type CursorPaginationQueryParams = {
  cursor: string | null;
  pageSize: number;
};

export type CursorPaginationLoadedResult<TItem> = {
  status: 'loaded';
  items: TItem[];
  nextCursor: string | null;
};

export type CursorPaginationFailedResult<TFailureReason> = {
  status: 'failed';
  reason: TFailureReason;
};

export type CursorPaginationQueryResult<TItem, TFailureReason> =
  | CursorPaginationLoadedResult<TItem>
  | CursorPaginationFailedResult<TFailureReason>;

export type UseCursorPaginationQueryOptions<TItem, TFailureReason> = {
  initialCursor?: string | null;
  pageSize: number;
  autoLoad?: boolean;
  query: (
    params: CursorPaginationQueryParams,
  ) => Promise<CursorPaginationQueryResult<TItem, TFailureReason>>;
};

export function useCursorPaginationQuery<TItem, TFailureReason = unknown>({
  autoLoad = true,
  initialCursor = null,
  pageSize,
  query,
}: UseCursorPaginationQueryOptions<TItem, TFailureReason>) {
  const [items, setItems] = useState<TItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNextPage, setIsLoadingNextPage] = useState(false);
  const [failureReason, setFailureReason] = useState<TFailureReason | null>(
    null,
  );
  const requestIdRef = useRef(0);

  const loadFirstPage = useCallback(async () => {
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setIsLoading(true);
    setIsLoadingNextPage(false);
    setFailureReason(null);

    let result: CursorPaginationQueryResult<TItem, TFailureReason>;

    try {
      result = await query({
        cursor: initialCursor,
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
    setNextCursor(result.nextCursor);

    return result;
  }, [initialCursor, pageSize, query]);

  const loadNext = useCallback(async () => {
    if (nextCursor === null || isLoading || isLoadingNextPage) {
      return;
    }

    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setIsLoadingNextPage(true);
    setFailureReason(null);

    let result: CursorPaginationQueryResult<TItem, TFailureReason>;

    try {
      result = await query({
        cursor: nextCursor,
        pageSize,
      });
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setIsLoadingNextPage(false);
      }

      throw error;
    }

    if (requestId !== requestIdRef.current) {
      return result;
    }

    setIsLoadingNextPage(false);

    if (result.status === 'failed') {
      setFailureReason(result.reason);
      return result;
    }

    setItems((currentItems) => [...currentItems, ...result.items]);
    setNextCursor(result.nextCursor);

    return result;
  }, [isLoading, isLoadingNextPage, nextCursor, pageSize, query]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setFailureReason(null);
    setIsLoading(false);
    setIsLoadingNextPage(false);
    setItems([]);
    setNextCursor(initialCursor);
  }, [initialCursor]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadFirstPage();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoLoad, loadFirstPage]);

  return useMemo(
    () => ({
      failureReason,
      hasNextPage: nextCursor !== null,
      isLoading,
      isLoadingNextPage,
      items,
      loadNext,
      nextCursor,
      reload: loadFirstPage,
      reset,
    }),
    [
      failureReason,
      isLoading,
      isLoadingNextPage,
      items,
      loadFirstPage,
      loadNext,
      nextCursor,
      reset,
    ],
  );
}
