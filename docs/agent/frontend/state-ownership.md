# Frontend State Ownership Decision Tree

Use this guide when deciding where frontend state belongs.

If ownership is unclear after this decision tree, ask the user before coding.
Do not move state into global, feature, or shared stores based on speculation.

## Decision Tree

1. Is this state about the app shell/session rather than one business area?
   - Put it in `src/app/global/<module>`.
   - Examples: auth user/session, access token, app context, global feedback,
     app-wide settings.

2. Is this state about one business area?
   - Put it in `src/features/<domain>/<slice>/store.ts`.
   - Put state mutations in `src/features/<domain>/<slice>/actions.ts`.
   - Add a feature runtime when pages need page-local feature store/action
     instances.
   - Feature state can be used by one page or by multiple pages.
   - Commands may use this feature state through actions; put commands in the
     page or feature owner based on `docs/agent/frontend/commands.md`.
   - Examples: loaded organization list, organization detail data, metadata
     list data.

3. Is this state only for one page's process or UI flow?
   - Put it in the page VM hook or a page-local form hook.
   - Examples: modal open state, current page filter, draft form values, field
     errors, submit error, route lifecycle state, command-result reactions.
   - If the same domain UI is reused by multiple pages, supporting hooks may be
     colocated with that domain component under
     `src/features/<domain>/components/<componentName>`. Each page VM still
     creates or controls its own instance, so draft values, field errors,
     selection state, and other page-flow state remain page-owned.
   - Do not move state into a feature store just because a reusable component
     lives under `src/features/<domain>/components`.

   Example:

   ```txt
   src/features/organization/components/organizationForm/
     OrganizationForm.tsx
     useOrganizationForm.ts
   ```

   `useOrganizationForm()` may define the reusable form contract, but
   `useOrganizationListPageVM()` and `useOrganizationDetailPageVM()` each call
   it for their own form instance. The page VM still owns submit/cancel
   handlers and command-result reactions.

4. Is this state only for one component and not controlled by page or business flow?
   - Use component local state.
   - Examples: hover state, password visibility, local combobox search text,
     an uncontrolled dropdown's open state.
   - If component state is controlled by page flow, command results,
     validation, or business rules, keep it in the page VM and pass it through
     props.

## Ask First

Ask the user before coding when:

- state ownership could reasonably fit more than one bucket
- reuse is speculative
- moving state would affect multiple pages or workflows
- a page appears to need state from another page
