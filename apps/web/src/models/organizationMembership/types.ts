import type {
  CreateOrganizationMembershipRequest,
  CreateOrganizationMembershipSuccessResponse,
  ListOrganizationMembershipsSuccessResponse,
  OffsetPaginationDto,
  OrganizationMembershipDto,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
  OrganizationMembershipWithUserDto,
  UpdateOrganizationMembershipRequest,
  UpdateOrganizationMembershipSuccessResponse,
} from '@repo/shared';

export type {
  CreateOrganizationMembershipRequest,
  CreateOrganizationMembershipSuccessResponse,
  ListOrganizationMembershipsSuccessResponse,
  OffsetPaginationDto,
  OrganizationMembershipDto,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
  OrganizationMembershipWithUserDto,
  UpdateOrganizationMembershipRequest,
  UpdateOrganizationMembershipSuccessResponse,
};
export {
  createOrganizationMembershipSchema,
  organizationMembershipRoles,
  updateOrganizationMembershipSchema,
} from '@repo/shared';

export type OrganizationMembership = OrganizationMembershipWithUserDto;
export type OrganizationMembershipListPage = OffsetPaginationDto;

export type OrganizationMembershipAddFormValues = {
  email: string;
  username: string;
  temporaryPassword: string;
  role: OrganizationMembershipRole;
};

export type OrganizationMembershipEditFormValues = {
  role: OrganizationMembershipRole;
};
