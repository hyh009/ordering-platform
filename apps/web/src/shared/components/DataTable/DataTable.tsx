import type { ReactNode } from 'react';
import { ChevronDown, ChevronsUpDown, ChevronUp, Search } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { OptionsSelect } from '@/shared/components/form/OptionsSelect';
import { Input } from '@/shared/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { cn } from '@/shared/utils/cn';
import { DataTablePagination } from './DataTablePagination';
import type {
  DataTableColumn,
  DataTableLabels,
  DataTablePaginationProps,
  DataTableSort,
} from './types';

const DEFAULT_LIMIT_OPTIONS = [10, 25, 50];

export type DataTableProps<TRow> = {
  columns: DataTableColumn<TRow>[];
  data: TRow[];
  rowKey: (row: TRow) => string;
  isLoading?: boolean;

  /** Controlled search box. Omit `onSearchChange` to hide the search box. */
  search?: string;
  onSearchChange?: (value: string) => void;

  /**
   * Extra controls (e.g. domain filters) rendered in the toolbar row next to
   * the search box. Keep domain-specific filter UI here, passed by the caller.
   */
  toolbar?: ReactNode;

  /**
   * Server-side sort. The table only emits the next sort state; the caller
   * reloads data. Clicking a sortable header cycles asc -> desc -> none.
   */
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;

  /**
   * Rows-per-page selector. Omit `onLimitChange` to hide it.
   *
   * NOTE: The caller owns reset semantics when the limit changes:
   * - offset pagination should jump back to the first page (offset 0)
   * - cursor pagination should clear the cursor and refetch from the start
   */
  limit?: number;
  limitOptions?: number[];
  onLimitChange?: (limit: number) => void;

  pagination?: DataTablePaginationProps;

  onRowClick?: (row: TRow) => void;

  labels?: DataTableLabels;
};

function nextSortState(
  current: DataTableSort | null | undefined,
  key: string,
): DataTableSort | null {
  if (!current || current.key !== key) {
    return { key, direction: 'asc' };
  }

  if (current.direction === 'asc') {
    return { key, direction: 'desc' };
  }

  return null;
}

function SortIcon({
  sort,
  columnKey,
}: {
  sort: DataTableSort | null | undefined;
  columnKey: string;
}) {
  if (!sort || sort.key !== columnKey) {
    return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />;
  }

  return sort.direction === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" />
  );
}

/**
 * @reusable
 * @description Shared data table with search, server-side sort, rows-per-page, and offset or cursor pagination.
 * @keywords table, data table, list, sort, search, pagination, rows per page
 */
export function DataTable<TRow>({
  columns,
  data,
  rowKey,
  isLoading = false,
  search,
  onSearchChange,
  toolbar,
  sort,
  onSortChange,
  limit,
  limitOptions = DEFAULT_LIMIT_OPTIONS,
  onLimitChange,
  pagination,
  onRowClick,
  labels,
}: DataTableProps<TRow>) {
  const { tDefault } = useAppTranslation();
  // Generic table chrome is localized here so callers only override the
  // domain-specific labels (e.g. the empty message or search placeholder).
  const mergedLabels: Required<DataTableLabels> = {
    search: tDefault('common.table.search', 'Search'),
    empty: tDefault('common.table.empty', 'No results.'),
    previous: tDefault('common.actions.previous', 'Previous'),
    next: tDefault('common.actions.next', 'Next'),
    rowsPerPage: tDefault('common.pagination.rowsPerPage', 'Rows per page'),
    goToPage: tDefault('common.pagination.goToPage', 'Go to page'),
    previousWindow: tDefault('common.pagination.previousPages', 'Previous pages'),
    nextWindow: tDefault('common.pagination.nextPages', 'Next pages'),
    ...labels,
  };
  const showSearch = onSearchChange != null;
  const showLimit = onLimitChange != null;
  const showToolbarRow = showSearch || toolbar != null;
  const showFooter = showLimit || pagination !== undefined;
  const isEmpty = data.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {showToolbarRow ? (
        <div className="flex flex-wrap items-center gap-3">
          {showSearch ? (
            <div className="relative max-w-sm flex-1 basis-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder={mergedLabels.search}
                type="search"
                value={search ?? ''}
              />
            </div>
          ) : null}
          {toolbar != null ? (
            <div className="flex items-center gap-2">{toolbar}</div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {columns.map((column) => {
                const canSort = column.sortable === true && onSortChange != null;
                const isRight = column.align === 'right';

                return (
                  <TableHead
                    key={column.key}
                    className={cn(
                      isRight && 'text-right',
                      column.className,
                      column.headerClassName,
                    )}
                  >
                    {canSort ? (
                      <button
                        className={cn(
                          'inline-flex items-center gap-1 font-medium hover:text-foreground',
                          isRight && 'flex-row-reverse',
                        )}
                        onClick={() =>
                          onSortChange?.(nextSortState(sort, column.key))
                        }
                        type="button"
                      >
                        {column.header}
                        <SortIcon columnKey={column.key} sort={sort} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={rowKey(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/40' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      column.align === 'right' && 'text-right',
                      column.className,
                      column.cellClassName,
                    )}
                  >
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {isEmpty && !isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {mergedLabels.empty}
          </p>
        ) : null}
      </div>

      {showFooter ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          {showLimit ? (
            <label className="flex items-center gap-2">
              <span>{mergedLabels.rowsPerPage}</span>
              <OptionsSelect
                className="h-8 w-auto"
                onValueChange={(value) => onLimitChange?.(Number(value))}
                options={limitOptions.map((option) => ({
                  label: String(option),
                  value: String(option),
                }))}
                value={limit !== undefined ? String(limit) : ''}
              />
            </label>
          ) : (
            <span />
          )}

          {pagination ? (
            <DataTablePagination
              isLoading={isLoading}
              labels={mergedLabels}
              pagination={pagination}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
