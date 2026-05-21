export type PaginationPage = {
  limit: number;
  offset: number;
  total: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function toPaginationPage<TPage extends PaginationPage>(
  pagination: Partial<PaginationPage> | undefined,
  fallback: TPage,
): TPage {
  const limit =
    isFiniteNumber(pagination?.limit) && pagination.limit > 0
      ? pagination.limit
      : fallback.limit;
  const offset =
    isFiniteNumber(pagination?.offset) && pagination.offset >= 0
      ? pagination.offset
      : fallback.offset;
  const total =
    isFiniteNumber(pagination?.total) && pagination.total >= 0
      ? pagination.total
      : fallback.total;

  return {
    ...fallback,
    limit,
    offset,
    total,
  };
}
