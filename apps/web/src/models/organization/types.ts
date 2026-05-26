import type {
  CreateOrganizationRequest,
  CreateOrganizationSuccessResponse,
  GetOrganizationSuccessResponse,
  ListOrganizationsSuccessResponse,
  OffsetPaginationDto,
  OrganizationAddressDto,
  OrganizationDto,
  OrganizationListItemDto,
  OrganizationPhoneDto,
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
  OrganizationAddressDto,
  OrganizationDto,
  OrganizationListItemDto,
  OrganizationPhoneDto,
  OrganizationStatus,
  UpdateOrganizationRequest,
  UpdateOrganizationSuccessResponse,
};

export type Organization = OrganizationDto;
export type OrganizationListItem = OrganizationListItemDto;
export type OrganizationListPage = OffsetPaginationDto;

export type OrganizationFormValues = {
  name: string;
  ownerUserId: string;
  status: OrganizationStatus;
  domain: string;
  contactEmail: string;
  contactPhone: string;
  address: {
    postalCode: string;
    city: string;
    district: string;
    streetAddress: string;
  };
};
