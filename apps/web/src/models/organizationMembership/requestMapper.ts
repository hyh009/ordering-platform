import type {
  CreateOrganizationMembershipRequest,
  OrganizationMembershipAddFormValues,
  OrganizationMembershipEditFormValues,
  OrganizationMembershipStatus,
  UpdateOrganizationMembershipRequest,
} from './types';

export function toCreateOrganizationMembershipRequest(
  values: OrganizationMembershipAddFormValues,
): CreateOrganizationMembershipRequest {
  return {
    userId: values.userId.trim(),
    role: values.role,
  };
}

export function toUpdateOrganizationMembershipRoleRequest(
  values: OrganizationMembershipEditFormValues,
): UpdateOrganizationMembershipRequest {
  return { role: values.role };
}

export function toDisableOrganizationMembershipRequest(): UpdateOrganizationMembershipRequest {
  return { status: 'disabled' as OrganizationMembershipStatus };
}
