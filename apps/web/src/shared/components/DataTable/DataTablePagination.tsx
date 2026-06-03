import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';
import { getPageNumberWindow } from '@/shared/utils/offsetPagination';
import type { DataTableLabels, DataTablePaginationProps } from './types';

type DataTablePaginationControlsProps = {
  pagination: DataTablePaginationProps;
  isLoading: boolean;
  labels: Required<
    Pick<DataTableLabels, 'previous' | 'next' | 'goToPage' | 'previousWindow' | 'nextWindow'>
  >;
};

export function DataTablePagination({
  pagination,
  isLoading,
  labels,
}: DataTablePaginationControlsProps) {
  if (pagination.type === 'cursor') {
    const showPrevious = pagination.onPreviousPage != null;

    return (
      <div className="flex gap-2">
        {showPrevious ? (
          <Button
            disabled={!pagination.hasPreviousPage || isLoading}
            onClick={() => pagination.onPreviousPage?.()}
            type="button"
            variant="secondary"
          >
            {labels.previous}
          </Button>
        ) : null}
        <Button
          disabled={!pagination.hasNextPage || isLoading}
          onClick={() => pagination.onNextPage()}
          type="button"
          variant="secondary"
        >
          {labels.next}
        </Button>
      </div>
    );
  }

  const {
    pages,
    hasPreviousWindow,
    hasNextWindow,
    previousWindowPage,
    nextWindowPage,
  } = getPageNumberWindow({
    page: pagination.page,
    totalPages: pagination.totalPages,
    windowSize: pagination.pageWindowSize,
  });

  return (
    <div className="flex items-center gap-1">
      {hasPreviousWindow ? (
        <Button
          aria-label={labels.previousWindow}
          disabled={isLoading}
          onClick={() => pagination.onPageChange(previousWindowPage)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      ) : null}

      {pages.map((pageNumber) => {
        const isCurrent = pageNumber === pagination.page;

        return (
          <Button
            key={pageNumber}
            aria-current={isCurrent ? 'page' : undefined}
            aria-label={`${labels.goToPage} ${pageNumber}`}
            className={cn('min-w-7 px-2', isCurrent && 'pointer-events-none')}
            disabled={isLoading}
            onClick={() => pagination.onPageChange(pageNumber)}
            size="sm"
            type="button"
            variant={isCurrent ? 'default' : 'ghost'}
          >
            {pageNumber}
          </Button>
        );
      })}

      {hasNextWindow ? (
        <Button
          aria-label={labels.nextWindow}
          disabled={isLoading}
          onClick={() => pagination.onPageChange(nextWindowPage)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
