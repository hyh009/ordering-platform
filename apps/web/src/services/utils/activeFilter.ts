/**
 * Appends an `isActive` query parameter to a URL path.
 *
 * Used by list services that support active/inactive filtering.
 */
export function withActiveFilter(path: string, isActive: string): string {
  const params = new URLSearchParams({ isActive });

  return `${path}?${params.toString()}`;
}
