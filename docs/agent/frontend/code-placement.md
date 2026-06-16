# Frontend Code Placement

Use this quick map when deciding where new frontend code belongs.

| Code                        | Put it here                                                                        | Do not put it here                             |
| --------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| Route page view             | `apps/web/src/pages/<route>/`                                                      | `features/`, `shared/`                         |
| Page VM hook                | `apps/web/src/pages/<route>/use<Page>VM.ts`                                        | `features/`, reusable components               |
| Page-owned command          | `apps/web/src/pages/<route>/*.commands.ts`                                         | feature commands called directly from page VMs |
| Canonical feature state     | `apps/web/src/features/<area>/<resource>/store.ts`                                 | page folders, app-global session modules       |
| Feature list state          | `apps/web/src/features/<area>/<resource>/list/store.ts`                            | page folders                                   |
| Feature detail state        | `apps/web/src/features/<area>/<resource>/detail/store.ts`                          | page folders                                   |
| Feature action              | `<resource>/actions.ts` or `<resource>/<slice>/actions.ts`                         | stores, services                               |
| Canonical feature command   | `apps/web/src/features/<area>/<resource>/commands.ts`                              | distinct list/detail read models               |
| Feature read command        | `apps/web/src/features/<area>/<resource>/list/commands.ts` or `detail/commands.ts` | views, stores                                  |
| Feature mutation command    | `apps/web/src/features/<area>/<resource>/mutations/commands.ts`                    | views, stores, services                        |
| Reusable feature workflow   | `apps/web/src/features/<area>/<workflow>/commands.ts`                              | app-global session modules                     |
| Request boundary validation | feature or page command that owns the submit/mutation flow                         | views, services                                |
| Feature runtime wiring      | `<resource>/runtime.ts` or `<resource>/<slice>/runtime.ts`                         | page components                                |
| Domain reusable component   | feature-local `components/` or `features/components/<domain>/`                     | `shared/components`                            |
| Project-generic UI control  | `apps/web/src/shared/components/`                                                  | domain feature folders                         |
| API path constants          | `apps/web/src/api/paths/`                                                          | services, pages                                |
| API service                 | `apps/web/src/services/`                                                           | commands, models                               |
| Frontend model types        | `apps/web/src/models/<domain>/types.ts`                                            | pages, features                                |
| DTO-to-model conversion     | `apps/web/src/models/<domain>/model.ts`                                            | services inline logic                          |
| Request/form mapping        | `apps/web/src/models/<domain>/requestMapper.ts` or `formMapper.ts`; beside a reusable feature form component when its form-value type is feature-owned | views                                          |
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
- Use `apps/web/src/features/components/<domain>/` for feature-owned components
  that are reusable across actor folders such as `admin/` and `merchant/`.
- Treat `features/<area>` as a reusable business capability area. Add a
  `<resource>` level when the area owns multiple collections or when it keeps
  list, detail, mutations, and components easier to scan.
- Use feature stores for API-loaded resource state. Use page VMs or form hooks
  for UI process state, command-result reactions, and form drafts.
- Follow `docs/agent/frontend/commands.md` for command placement, workflow
  ownership, and post-mutation data reloads.
- Keep a page command wrapper for page-owned async flows, even when the wrapper
  only forwards to a feature read or mutation command.
- Form-to-request mappers default to `models/<domain>`. Colocate a pure mapper
  with its reusable feature form component instead when the form-value type is
  owned by that feature and shared across pages, mirroring `storeFormMapper.ts`.
  This keeps the lower model layer from importing `features`.
- If the code type is not listed here, or if it could reasonably belong in more
  than one place, discuss ownership with the user before adding it.
