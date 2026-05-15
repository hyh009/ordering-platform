# Starter to Ordering Platform Migration

This document tracks the steps used to turn the cloned starter into an
ordering platform. Keep it current while changing the repo so the same cleanup
path can be reused in a future project.

## Goal

Build an ordering system from the React + Express starter.

The starter is only an architecture and workflow reference. This is a new
ordering-platform project, so starter data shapes, demo behavior, copy, and
domain assumptions do not need backward compatibility. If a starter pattern does
not fit the ordering product, replace it instead of preserving compatibility.

Near-term scope:

- Remove or replace starter-only Todo demo code.
- Rename project-facing docs and metadata from starter wording to ordering
  platform wording.
- Keep the useful starter foundation: auth, shared API contracts, API
  validation, Mongo setup, Swagger, frontend architecture, shadcn UI, and i18n
  scaffolding.
- Add ordering-domain features in small slices.

Later scope:

- Add AI-assisted ordering after the core ordering flow is stable.

## Current Starter Inventory

Keep:

- `apps/api` Express API foundation.
- `apps/web` React/Vite frontend foundation.
- `packages/shared` public API contract boundary.
- `docs/agent/index.yaml` and the small agent workflow guides.
- Auth/session flow unless the ordering product needs a different login model.
- Mongo/Redis Docker setup.
- Swagger/OpenAPI setup.
- i18n tooling if the ordering UI will support multiple languages.

Replace or remove:

- Starter data compatibility paths that only exist for old demo data.
- Root package name `react-express-starter`.
- README title and feature text that describes the repo as a generic starter.
- Todo contracts in `packages/shared/src/contracts/todo.ts`.
- Todo API route, service, repository, model, seed data, and tests under
  `apps/api`.
- Todo frontend pages, feature stores/actions/components, models, services,
  route labels, and tests under `apps/web`.
- Starter-facing auth UI copy such as "Starter auth" and "Protected starter".
- Starter demo assets such as default Vite/React assets if they are unused.

## Target Domain Slices

Build in this order unless the product direction changes:

- Menu catalog: categories, menu items, availability, price, images, tags.
- Cart: selected items, quantities, options, notes, subtotal.
- Order placement: customer info, order type, order status, totals.
- Admin/menu management: create and update menu items.
- AI-assisted ordering: intent parsing, item suggestions, allergen/preferences
  checks, and cart confirmation. Do this after menu and cart contracts exist.

## Migration Checklist

- [x] Read `docs/agent/index.yaml` before editing.
- [x] Create this migration record.
- [x] Rename root metadata and README from starter to ordering platform.
- [x] Replace web app metadata, package descriptions, logo, and favicon.
- [x] Remove unused starter demo assets from the web app.
- [x] Replace generic starter wording in auth examples, auth UI copy, and agent
      docs.
- [ ] Update environment variables and config files:
      `apps/api/.env`, Google credentials, and
      `apps/web/scripts/i18n.config.json`.
- [x] Decide whether starter auth stays as-is for MVP.
- [ ] Design and implement multi-tenant auth:
      platform user, organization, membership, platform roles, and
      organization roles.
- [ ] Replace Todo shared contracts with ordering-domain contracts.
- [ ] Replace Todo backend slice with menu/order slices.
- [ ] Replace Todo frontend screens with ordering screens.
- [ ] Update Swagger and feature docs for the new ordering APIs.
- [ ] Update tests to cover ordering behavior.
- [x] Run docs/code verification after each change batch.

## Progress

| Area                    | Status                 | Notes                                                                                                                                                                                 |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent entrypoint        | Done                   | `docs/agent/index.yaml` was checked before changes.                                                                                                                                   |
| Migration tracking      | Done                   | This file is the running migration record.                                                                                                                                            |
| Project identity        | Done                   | Root package name, README, app name, package descriptions, and web metadata now use ordering-platform wording.                                                                        |
| Web branding            | Done                   | `apps/web/src/assets/logo.svg` is used in the app shell, and `apps/web/public/favicon.svg` uses the same logo for the browser tab icon.                                               |
| Starter demo assets     | Done                   | Removed unused Vite/React/demo image assets from `apps/web/src/assets`.                                                                                                               |
| Starter wording cleanup | Done                   | Removed generic starter wording from auth UI copy, auth examples/tests, and agent docs where it was not historical context.                                                           |
| Environment config      | Manual step pending    | Update backend API `.env`, add Google credentials, and create `apps/web/scripts/i18n.config.json`. Do not commit secret values.                                                       |
| Multi-tenant auth       | Design started         | Auth must support ordering, management, and super admin platforms. `docs/features/auth.md` records current behavior and agreed direction; detailed drafts stay in the temporary plan. |
| Todo demo feature       | Paused                 | Keep Todo code unchanged until the ordering schema is designed.                                                                                                                       |
| Ordering schema         | Blocked by auth design | Design tenant ownership first, then menu/cart/order schemas before replacing Todo contracts or routes.                                                                                |
| AI-assisted ordering    | Not started            | Defer until menu/cart/order flows exist.                                                                                                                                              |
| Verification            | Done for current batch | `pnpm --filter web run lint`, `pnpm --filter web run build`, and `pnpm --filter api run test` passed.                                                                                 |

## Reusable Steps for Future Projects

1. Read the repo's agent entrypoint and registry first.
2. Create a migration record before deleting demo code.
3. Inventory starter code into `keep`, `replace`, and `remove` groups.
4. Rename project metadata and README early, but keep architecture docs unless
   they are actually wrong for the new product.
5. Treat starter code as a reference, not a compatibility contract.
6. Replace demo contracts before replacing backend and frontend consumers.
7. Replace backend and frontend by domain slice instead of deleting everything
   at once.
8. Keep verification narrow for each batch, then run full workspace checks after
   the main migration compiles.

## Work Log

### 2026-05-14

- Read `docs/agent/index.yaml`.
- Confirmed this repo is still structurally the React + Express starter.
- Found starter/Todo remnants across README, shared contracts, API, web pages,
  tests, and UI copy.
- Created this migration record as the source of truth for cleanup steps.

### 2026-05-15

- Renamed project-facing metadata and README to ordering platform wording.
- Removed generic starter wording from app name, language storage key, auth page
  copy, and agent docs.
- Replaced starter usernames in auth examples/tests with ordering-platform
  examples.
- Removed unused Vite/React/demo image assets from the web app.
- Updated web HTML metadata and package descriptions for the ordering platform.
- Replaced the public favicon with the ordering platform logo.
- Replaced the default Vite web README with ordering-platform web notes.
- Added a pending manual environment/config step for `apps/api/.env`, Google
  credentials, and `apps/web/scripts/i18n.config.json`.
- Started multi-tenant auth design from old `references/user.model.ts.backup`
  and `references/organization.model.ts.backup`.
- Added `docs/agent/temp/plan/multi-tenant-auth-20260515-1522.md` for
  unsettled multi-tenant auth planning.
- Kept `docs/features/auth.md` focused on current auth behavior and agreed
  direction, with detailed schema drafts kept in the temporary plan.
- Left Todo routes/contracts/pages in place until ordering schemas are designed.
- Formatted changed files.
- Verified this batch with `pnpm --filter web run lint`,
  `pnpm --filter web run build`, and `pnpm --filter api run test`.
