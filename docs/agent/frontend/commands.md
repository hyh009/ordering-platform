# Frontend Commands

Use this guide when adding or changing frontend command files.

## Goal

Commands coordinate async frontend flows.

They sit between page VM hooks and services/actions:

```txt
Page VM Hook -> Commands -> Service -> API
                         -> Feature Actions -> Feature Store
```

Commands return typed outcomes to the VM. The VM owns React lifecycle, page-local
UI state, form state, navigation, modal state, and command-result reactions.

## Placement

Use feature slice commands for the default async behavior of one feature state
slice:

```txt
src/features/<domain>/<slice>/commands.ts
```

Use page commands to select, wrap, or override feature slice commands for one
page:

```txt
src/pages/<pageName>/<pageName>Page.commands.ts
```

Feature commands must not import from `src/pages`.

Page commands are private to their page folder. Do not import one page command
from another page. Extract shared command behavior into a feature slice command,
then wrap it from each page command.

Do not create broad domain commands that mix different state slices, such as
list and detail, unless those slices intentionally share the same store/actions.

## Responsibilities

Commands may:

- call services
- call feature actions
- map API errors with named helpers
- return typed success or failure results

Commands must not:

- use React hooks
- own page-local UI or form state
- navigate
- show toast or modal feedback directly
- handle raw API DTOs directly

## Factory Shape

Use factories when commands need actions tied to a specific store instance.

```ts
export function createOrganizationListCommands(
  actions: OrganizationListActions,
) {
  return {
    async loadOrganizations(input) {
      actions.loadStarted();

      const result = await organizationService.listOrganizations(input);

      actions.loadSucceeded(result);

      return {
        status: 'loaded',
      };
    },
  };
}
```

Avoid static classes for commands that mutate feature state. Static commands
hide which store instance they operate on.

## Runtime Wiring

Runtime factories wire stateful store/action instances. Keep commands with the
owner of the command flow.

Page VM hooks should not create feature stores and actions directly. Use a
feature runtime to create store/action instances, then create page-owned
commands in the VM context.

Use a feature slice runtime when pages need a feature store/actions pair:

```ts
export function createOrganizationListRuntime() {
  const store = createOrganizationListStore();
  const actions = createOrganizationListActions(store);

  return {
    actions,
    store,
  };
}
```

The page VM may then create its page-owned commands from the feature actions:

```ts
function createOrganizationListPageContext() {
  const { actions, store } = createOrganizationListRuntime();
  const commands = createOrganizationListPageCommands(actions);

  return {
    commands,
    store,
  };
}
```

Add a separate page runtime file only when page-level wiring becomes complex or
needs reuse.

Keep runtime files with their feature slice:

```txt
src/features/<domain>/<slice>/runtime.ts
```

## Shared Base And Page Wrappers

When most behavior is shared, keep a shared command base and let pages wrap only
the functions they need.

Define the slice command contract near the feature slice command:

```ts
export type OrganizationListCommands = {
  listOrganizations(input: ListInput): Promise<ListResult>;
  createOrganization(input: CreateInput): Promise<SaveResult>;
  updateOrganizationListItem(
    id: string,
    input: UpdateListItemInput,
  ): Promise<SaveResult>;
};
```

Page commands should expose a page-specific subset plus page-specific functions:

```ts
type OrganizationPickerPageCommands = Pick<
  OrganizationListCommands,
  'listOrganizations'
> & {
  searchOrganizations(input: SearchInput): Promise<SearchResult>;
};
```

Use an explicit `overrides` block when a page replaces shared behavior:

```ts
export function createOrganizationPickerPageCommands(
  actions: OrganizationListActions,
): OrganizationPickerPageCommands {
  const base = createOrganizationListCommands(actions);

  const overrides = {
    async searchOrganizations(input) {
      return organizationSearchService.search(input);
    },
  } satisfies Partial<OrganizationPickerPageCommands>;

  return {
    listOrganizations: base.listOrganizations,
    ...overrides,
  };
}
```

This keeps the full function list visible in the command type and page-specific
differences visible in the `overrides` block.

## Choosing Shared Or Page-Owned

Use page command overrides when the flow includes page-specific choices:

- reload strategy
- pagination request strategy
- filter interaction
- modal and form outcomes
- navigation outcomes
- page-specific result shapes

For pagination button behavior and page math, use
`docs/agent/frontend/pagination.md`.

Use feature slice commands for default async behavior tied to that slice/store.

Do not add option-heavy shared commands to cover many page variations. If a page
needs different behavior, wrap the shared command or create a page command.
