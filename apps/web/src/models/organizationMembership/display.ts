import type { AppTranslator } from '@/app/i18n';
import { organizationMembershipRoles } from '@repo/shared';
import type {
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
} from './types';

export function getOrganizationMembershipRoleLabel(
  role: OrganizationMembershipRole,
  tDefault: AppTranslator,
) {
  switch (role) {
    case 'org_owner':
      return tDefault('admin.memberships.roles.orgOwner', 'Org Owner');
    case 'org_admin':
      return tDefault('admin.memberships.roles.orgAdmin', 'Org Admin');
    case 'staff':
      return tDefault('admin.memberships.roles.staff', 'Staff');
  }
}

export function getOrganizationMembershipRoleOptions(tDefault: AppTranslator) {
  return organizationMembershipRoles.map((role) => ({
    label: getOrganizationMembershipRoleLabel(role, tDefault),
    value: role,
  }));
}

export function getOrganizationMembershipStatusLabel(
  status: OrganizationMembershipStatus,
  tDefault: AppTranslator,
) {
  switch (status) {
    case 'active':
      return tDefault('admin.memberships.statuses.active', 'Active');
    case 'disabled':
      return tDefault('admin.memberships.statuses.disabled', 'Disabled');
  }
}
