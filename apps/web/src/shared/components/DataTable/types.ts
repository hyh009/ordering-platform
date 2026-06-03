import type { ReactNode } from 'react';

export type DataTableSortDirection = 'asc' | 'desc';

export type DataTableSort = {
  key: string;
  direction: DataTableSortDirection;
};

export type DataTableColumn<TRow> = {
  /** Stable column identity. Used as the sort key when `sortable` is true. */
  key: string;
  header: ReactNode;
  render: (row: TRow) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right';
  /** Extra classes applied to both the header cell and body cells. */
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
};

/**
 * Offset pagination shows numbered page buttons plus window jump arrows.
 * The caller owns the loader: `onPageChange` receives a 1-based page number.
 */
export type DataTableOffsetPagination = {
  type: 'offset';
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Page numbers shown per window before the jump arrow. Defaults to 10. */
  pageWindowSize?: number;
};

/**
 * Cursor pagination shows Previous / Next only.
 *
 * NOTE: Cursor pagination cannot go backwards on its own. To enable
 * `onPreviousPage`, the caller must maintain its own cursor history stack
 * (push each cursor before loading the next page, pop to go back). When no
 * `onPreviousPage` is provided the Previous button is hidden.
 */
export type DataTableCursorPagination = {
  type: 'cursor';
  hasNextPage: boolean;
  onNextPage: () => void;
  hasPreviousPage?: boolean;
  onPreviousPage?: () => void;
};

export type DataTablePaginationProps =
  | DataTableOffsetPagination
  | DataTableCursorPagination;

export type DataTableLabels = {
  /** Search input placeholder. */
  search?: string;
  /** Empty-state message shown when there are no rows. */
  empty?: string;
  previous?: string;
  next?: string;
  rowsPerPage?: string;
  /** Accessible label prefix for a numbered page button, e.g. "Go to page". */
  goToPage?: string;
  previousWindow?: string;
  nextWindow?: string;
};
