import type {
  CreateOrganizationRequest,
  CreateOrganizationSuccessResponse,
  GetOrganizationSuccessResponse,
  ListOrganizationsSuccessResponse,
  OffsetPaginationDto,
  OrganizationDto,
  OrganizationStatus,
  UpdateOrganizationRequest,
  UpdateOrganizationSuccessResponse,
} from '@repo/shared';

export type {
  CreateOrganizationRequest,
  CreateOrganizationSuccessResponse,
  GetOrganizationSuccessResponse,
  ListOrganizationsSuccessResponse,
  OffsetPaginationDto,
  OrganizationDto,
  OrganizationStatus,
  UpdateOrganizationRequest,
  UpdateOrganizationSuccessResponse,
};

export type Organization = OrganizationDto;

export type OrganizationListPage = OffsetPaginationDto;
