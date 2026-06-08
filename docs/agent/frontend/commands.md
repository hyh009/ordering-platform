# Frontend Commands

Use this guide when adding or changing frontend command files.

## Goal

Commands coordinate async frontend flows and protect the service/API boundary.

They sit between page VM hooks and services/actions:

```txt
Page VM Hook -> Commands -> Service -> API
                         -> Feature Actions -> Feature Store
```

Commands return typed outcomes to the VM. The VM owns React lifecycle, page-local
UI state, form state, navigation calls, modal state, and UI reactions to command
results.

## Placement

Use feature read commands for loading one feature read slice:

```txt
src/features/<area>/<resource>/<readSlice>/commands.ts
```

Use feature mutation commands for standard write operations for one resource
collection:

```txt
src/features/<area>/<resource>/mutations/commands.ts
```

Standard write operations include but are not limited to create, update, delete,
reorder, archive, and restore.

If `mutations/commands.ts` becomes too large, propose a focused split inside
`mutations/` before making the change.

Use page commands for page-owned async flows. Keep a page command wrapper even
when it only forwards to a feature read or mutation command:

```txt
src/pages/<pageName>/<pageName>Page.commands.ts
```

Feature commands must not import from `src/pages`.

Page commands are private to their page folder. Do not import one page command
from another page. Extract shared command behavior into a feature slice command,
then wrap it from each page command.

Page VMs call their page command for submit and mutation flows. The page command
selects the feature command, passes page context such as route params or active
store IDs, and owns any page-specific composition. Keep the wrapper thin when no
extra composition is needed.

Do not create broad domain commands that mix different read slices, such as list
and detail reads. Put collection writes in `mutations/commands.ts` when read
models come from the same resource collection.

## Responsibilities

Commands may:

- call services
- call feature actions
- validate request objects with shared or domain Zod schemas before service
  calls
- map API errors with named helpers
- return typed success or failure results

Commands must not:

- use React hooks
- own page-local UI or form state
- navigate
- show toast or modal feedback directly
- handle raw API DTOs directly

Commands own request boundary validation, not validation presentation. A command
that receives `CreateXRequest` or `UpdateXRequest` should run the matching
schema before calling the service and return typed field errors when validation
fails. The page VM writes those errors into the form state and decides whether
to focus fields, close modals, show toast, or navigate.

API-after data side effects belong to the command flow. When a successful
mutation needs to refresh list/detail/overview state, compose the mutation
command and the read-slice reload in commands, usually in the page command for
that page. The page VM handles UI reactions to the returned result, such as
closing a modal, resetting a form, showing toast, or calling navigation.

Page VMs and form hooks may still run UX validation for touched fields,
page-only fields, or immediate input feedback. Do not rely on VM-only
validation to protect a reusable mutation command.

Thin commands are acceptable when they define this boundary:

```txt
validate request -> call service -> map API error -> return typed result
```

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

Keep runtime files with their state slice:

```txt
src/features/<area>/<resource>/<slice>/runtime.ts
```

Mutation commands that do not update a feature store directly do not need a
runtime or actions factory.

## Shared Base And Page Wrappers

When most behavior is shared, keep a shared command base and let pages wrap only
the functions they need.

Define read-slice command contracts near the feature read command:

```ts
export type OrganizationListReadCommands = {
  listOrganizations(input: ListInput): Promise<ListResult>;
};
```

Page commands should expose a page-specific subset plus page-specific functions:

```ts
type OrganizationPickerPageCommands = Pick<
  OrganizationListReadCommands,
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
  const base = createOrganizationListReadCommands(actions);

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

Use feature read-slice commands for default async behavior tied to that
slice/store. Use feature mutation commands for reusable write behavior tied to
one resource collection.

Do not add option-heavy shared commands to cover many page variations. Wrap the
shared command in the page command for that page.

Do not add page-behavior options to reusable mutation commands, such as
`updateCategory(..., { reload: true })`. API-after data refresh belongs to the
command flow, not the reusable mutation command.

After a mutation succeeds, commands own data refresh reactions:

- reload list, detail, or overview data
- reload the current pagination/filter query
- reload related read slices shown by the same page

After the command returns, page VMs own UI reactions:

- close a modal
- reset or realign form state
- call navigation
- show toast or confirmation feedback

Keep feature command selection, submit/mutation calls, and post-mutation data
reloads in commands. Keep simple UI reactions in the page VM.

Management pages should reload server data after create, update, or delete
unless a local patch is deliberately required for the interaction.
