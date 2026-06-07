# Frontend Code Placement

Use this quick map when deciding where new frontend code belongs.

| Code                        | Put it here                                                                        | Do not put it here                             |
| --------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| Route page view             | `apps/web/src/pages/<route>/`                                                      | `features/`, `shared/`                         |
| Page VM hook                | `apps/web/src/pages/<route>/use<Page>VM.ts`                                        | `features/`, reusable components               |
| Page-owned command          | `apps/web/src/pages/<route>/*.commands.ts`                                         | feature commands called directly from page VMs |
| Feature list state          | `apps/web/src/features/<area>/<resource>/list/store.ts`                            | page folders                                   |
| Feature detail state        | `apps/web/src/features/<area>/<resource>/detail/store.ts`                          | page folders                                   |
| Feature action              | `apps/web/src/features/<area>/<resource>/<slice>/actions.ts`                       | stores, services                               |
| Feature read command        | `apps/web/src/features/<area>/<resource>/list/commands.ts` or `detail/commands.ts` | views, stores                                  |
| Feature mutation command    | `apps/web/src/features/<area>/<resource>/mutations/commands.ts`                    | views, stores, services                        |
| Request boundary validation | feature or page command that owns the submit/mutation flow                         | views, services                                |
| Feature runtime wiring      | `apps/web/src/features/<area>/<resource>/<slice>/runtime.ts`                       | page components                                |
| Domain reusable component   | `apps/web/src/features/<area>/<resource>/components/` or `<area>/components/`      | `shared/components`                            |
| Project-generic UI control  | `apps/web/src/shared/components/`                                                  | domain feature folders                         |
| API path constants          | `apps/web/src/api/paths/`                                                          | services, pages                                |
| API service                 | `apps/web/src/services/`                                                           | commands, models                               |
| Frontend model types        | `apps/web/src/models/<domain>/types.ts`                                            | pages, features                                |
| DTO-to-model conversion     | `apps/web/src/models/<domain>/model.ts`                                            | services inline logic                          |
| Request/form mapping        | `apps/web/src/models/<domain>/requestMapper.ts` or `formMapper.ts`                 | views                                          |
| Domain display labels       | `apps/web/src/models/<domain>/display.ts`                                          | components, shared contracts                   |
| Domain model public export  | `apps/web/src/models/<domain>/index.ts`                                            | private subfile imports from callers           |
| App shell or route guard    | `apps/web/src/app/`                                                                | pages, features                                |
| App/global runtime state    | `apps/web/src/app/global/<module>/`                                                | domain feature folders                         |

## Rules

- Import domain model APIs through `@/models/<domain>`, not private model files.
- `@repo/shared` remains the source of shared DTOs, zod schemas, and constants;
  web callers use them through the domain model public export when one exists.
- Keep raw API DTOs out of pages, commands, actions, stores, and views.
- Keep domain-specific components out of `apps/web/src/shared/components`.
- Treat `features/<area>` as a reusable business capability area. Add a
  `<resource>` level when the area owns multiple collections or when it keeps
  list, detail, mutations, and components easier to scan.
- Use feature stores for API-loaded resource state. Use page VMs or form hooks
  for UI process state, command-result reactions, and form drafts.
- Use `mutations/commands.ts` for standard create, update, and delete flows for
  one resource collection. Reload list or detail state from the page VM after
  success when the management UI favors server-confirmed data over local cache
  patching.
- Keep a page command wrapper for page-owned async flows, even when the wrapper
  only forwards to a feature read or mutation command.
- If the code type is not listed here, or if it could reasonably belong in more
  than one place, discuss ownership with the user before adding it.
