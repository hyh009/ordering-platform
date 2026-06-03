import { useStore } from 'zustand';
import { activeOrgStore } from '@/app/global/activeOrg/activeOrg.store';
import { authStore } from '@/app/global/auth/auth.store';
import type { OrganizationMembershipRole } from '@/models/organizationMembership';

// Roles allowed to manage (create/update) store-scoped resources. Mirrors the
// backend permission boundary in docs/features/permissions.md: org_owner and
// org_admin have CRUD, staff is read-only.
const MANAGER_ROLES: OrganizationMembershipRole[] = ['org_owner', 'org_admin'];

/**
 * The current user's role in the active organization, or null when there is no
 * authenticated user, no active org, or no membership for it.
 */
export function useActiveOrgRole(): OrganizationMembershipRole | null {
  const user = useStore(authStore, (state) => state.user);
  const organizationId = useStore(
    activeOrgStore,
    (state) => state.organizationId,
  );

  if (!user || !organizationId) {
    return null;
  }

  return (
    user.memberships.find(
      (membership) => membership.organizationId === organizationId,
    )?.role ?? null
  );
}

/**
 * Whether the active user may manage store-scoped resources (tags, categories,
 * products, modifiers, store settings, etc.). Staff get a read-only experience.
 */
export function useCanManageStoreResources(): boolean {
  const role = useActiveOrgRole();

  return role !== null && MANAGER_ROLES.includes(role);
}
