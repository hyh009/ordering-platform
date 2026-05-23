# Frontend Pagination

Use this when adding or changing paginated frontend pages.

## Ownership

- Feature stores own list data, loading state, errors, and pagination data.
- Page VMs own command wiring and route/page lifecycle.
- Shared pagination hooks own reusable pagination controls only.
- Shared pagination utils own pure page math only.

Do not use shared pagination hooks that own `items`, `isLoading`, `error`, or
auto-load query behavior while a feature store also owns those values.

## Offset Pagination

Use `useOffsetPaginationControls` when a page VM needs reusable previous/next
button behavior.

The page VM provides the loader:

```ts
const loadPage = useCallback(
  async ({ limit, offset }: OffsetPaginationLoadPageInput) => {
    await commands.loadItems({ limit, offset });
  },
  [commands],
);

const paginationControls = useOffsetPaginationControls({
  loadPage,
  pagination,
});
```

Use `offsetPagination.ts` utils for pure calculations such as `page`,
`totalPages`, `hasNextPage`, and next/previous offsets.

## Cursor Pagination

Use `useCursorPaginationControls` when a page VM needs reusable load-more
behavior.

The page VM provides the loader:

```ts
const paginationControls = useCursorPaginationControls({
  pagination,
  loadNextPage: async ({ nextCursor }) => {
    await commands.loadNextItems({ cursor: nextCursor });
  },
});
```

Use `cursorPagination.ts` utils for pure calculations such as `hasNextPage`.
