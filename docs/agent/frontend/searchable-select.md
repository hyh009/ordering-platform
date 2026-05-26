# Searchable Select

Use this guide when adding or updating a searchable select, async select, user
picker, product picker, postal-code picker, or any select that accepts typed
keywords.

## Component Boundary

Use `apps/web/src/shared/components/form/SearchableSelect.tsx` for the reusable
UI control.

`SearchableSelect` owns:

- input, popup, option rendering, loading rows, empty rows
- controlled `searchValue` display
- selected option display
- accessibility and invalid-state wiring
- generic `onSearchChange`, `onValueChange`, and `onLoadMore` callbacks

`SearchableSelect` must not own:

- API calls
- debounce timers
- cursor state
- option append/replace decisions
- feature store access
- commands
- domain labels or option construction
- business validation rules

Put data behavior in the page VM, feature hook, or local composing component.

## Controlled State

Keep search keyword and selected value separate.

- `searchValue`: the current typed keyword.
- `value`: the selected option value.
- `options`: the current option list to render.
- `onSearchChange(nextKeyword)`: update keyword and refresh options.
- `onValueChange(nextValue)`: update the selected value only after an option is
  selected.

Do not clear or change `value` just because the user typed a keyword unless the
product explicitly requires that behavior.

Do not derive `searchValue` from `value` on every render. It makes typing fight
the selected value.

## Local Options

For fixed local data, filter outside `SearchableSelect`.

Example:

```tsx
const [keyword, setKeyword] = useState('');

const filteredOptions = useMemo(() => {
  const query = keyword.trim().toLowerCase();

  if (!query) {
    return options;
  }

  return options.filter((option) =>
    option.searchLabel.toLowerCase().includes(query),
  );
}, [keyword, options]);

<SearchableSelect
  value={selectedValue}
  searchValue={keyword}
  options={filteredOptions}
  onSearchChange={setKeyword}
  onValueChange={setSelectedValue}
/>;
```

Local filtering usually does not need debounce.

## Remote API Search

For API-backed options, keep API work in the page VM or feature hook.

Use `onSearchChange` to update the raw keyword. Debounce the keyword in the VM
or hook, then call the API.

Example shape:

```tsx
<SearchableSelect
  value={selectedUserId}
  searchValue={userKeyword}
  options={userOptions}
  isLoading={isSearchingUsers}
  hasMore={hasMoreUsers}
  isLoadingMore={isLoadingMoreUsers}
  onSearchChange={setUserKeyword}
  onValueChange={setSelectedUserId}
  onLoadMore={loadMoreUsers}
/>
```

VM or hook responsibilities:

- debounce keyword, usually around `300ms`
- enforce minimum keyword length when needed
- call service/API with the debounced keyword
- replace options when keyword changes
- reset cursor when keyword changes
- append options when loading more
- ignore stale responses or cancel in-flight requests when needed
- map API DTOs into `SearchableSelectOption[]`

## Cursor Pagination

Cursor state belongs outside `SearchableSelect`.

Keep these together in the VM or feature hook:

- `keyword`
- debounced keyword
- `options`
- `cursor`
- `hasMore`
- `isLoading`
- `isLoadingMore`
- `loadMore()`

When keyword changes:

- reset cursor
- replace options with the first page
- do not append results from a previous keyword

When loading more:

- use the same debounced keyword
- pass the current cursor
- append returned options
- update `hasMore` and next cursor

## Selected Option

Remote searches can return options that do not include the currently selected
value.

Before rendering, ensure the selected option is still available to the control.
Use one of these approaches:

- merge the selected option into `options` in the VM or hook
- fetch the selected option by id before rendering
- pass a stable fallback option if the API result page does not include it

Do not let a selected value lose its label just because the current keyword
returns a different page of options.

## Option Values

Option `value` must be unique.

If the displayed business value is not unique, use a composite value for the UI
option and map it back to the form value in `onValueChange`.

Example:

```ts
const optionValue = `${postalCode}:${city}:${district}`;
```

Keep persisted form data clean. Do not save a composite UI value to the API
unless the API contract actually expects it.

## Common Bugs

- Tying `searchValue` to selected `value`, causing typed text to reset.
- Calling `onValueChange('')` when the user is only typing.
- Filtering in `SearchableSelect` and also filtering in the VM.
- Putting API calls or debounce logic inside `SearchableSelect`.
- Dropping the selected option from `options` during remote searches.
- Using a non-unique option value such as postal code alone.

## Verification

For searchable select changes, run:

```bash
pnpm --filter web run lint
pnpm --filter web run build:app
```

Manually check:

- typing changes the keyword shown in the input
- local filtering or remote options update after typing
- selected value does not change until an option is selected
- selected label remains visible after the options list changes
- loading, empty, and load-more states render correctly
