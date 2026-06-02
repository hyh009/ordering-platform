# Frontend Code Placement

Use this quick map when deciding where new frontend code belongs.

| Code                       | Put it here                                                        | Do not put it here                                |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| Route page view            | `apps/web/src/pages/<route>/`                                      | `features/`, `shared/`                            |
| Page VM hook               | `apps/web/src/pages/<route>/use<Page>VM.ts`                        | `features/`, reusable components                  |
| Page-owned command         | `apps/web/src/pages/<route>/*.commands.ts`                         | feature commands when only one page owns the flow |
| Domain feature state       | `apps/web/src/features/<domain>/<slice>/store.ts`                  | page folders                                      |
| Domain feature action      | `apps/web/src/features/<domain>/<slice>/actions.ts`                | stores, services                                  |
| Domain feature command     | `apps/web/src/features/<domain>/<slice>/commands.ts`               | views, stores                                     |
| Feature runtime wiring     | `apps/web/src/features/<domain>/<slice>/runtime.ts`                | page components                                   |
| Domain reusable component  | `apps/web/src/features/<domain>/components/`                       | `shared/components`                               |
| Project-generic UI control | `apps/web/src/shared/components/`                                  | domain feature folders                            |
| API path constants         | `apps/web/src/api/paths/`                                          | services, pages                                   |
| API service                | `apps/web/src/services/`                                           | commands, models                                  |
| Frontend model types       | `apps/web/src/models/<domain>/types.ts`                            | pages, features                                   |
| DTO-to-model conversion    | `apps/web/src/models/<domain>/model.ts`                            | services inline logic                             |
| Request/form mapping       | `apps/web/src/models/<domain>/requestMapper.ts` or `formMapper.ts` | views                                             |
| Domain display labels      | `apps/web/src/models/<domain>/display.ts`                          | components, shared contracts                      |
| Domain model public export | `apps/web/src/models/<domain>/index.ts`                            | private subfile imports from callers              |
| App shell or route guard   | `apps/web/src/app/`                                                | pages, features                                   |
| App/global runtime state   | `apps/web/src/app/global/<module>/`                                | domain feature folders                            |

## Rules

- Import domain model APIs through `@/models/<domain>`, not private model files.
- `@repo/shared` remains the source of shared DTOs, zod schemas, and constants;
  web callers use them through the domain model public export when one exists.
- Keep raw API DTOs out of pages, commands, actions, stores, and views.
- Keep domain-specific components out of `apps/web/src/shared/components`.
- If the code type is not listed here, or if it could reasonably belong in more
  than one place, discuss ownership with the user before adding it.
