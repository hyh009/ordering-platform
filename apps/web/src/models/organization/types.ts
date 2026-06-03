import type {
  CreateOrganizationRequest,
  CreateOrganizationSuccessResponse,
  GetOrganizationSuccessResponse,
  ListOrganizationsQuery,
  ListOrganizationsSuccessResponse,
  OffsetPaginationDto,
  OrganizationAddressDto,
  OrganizationDto,
  OrganizationListItemDto,
  OrganizationPhoneDto,
  OrganizationReviewStatus,
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
  OrganizationReviewStatus,
  OrganizationStatus,
  UpdateOrganizationRequest,
  UpdateOrganizationSuccessResponse,
};

export type Organization = OrganizationDto;
export type OrganizationListItem = OrganizationListItemDto;
export type OrganizationListPage = OffsetPaginationDto;

export type OrganizationListSortBy = NonNullable<ListOrganizationsQuery>['sortBy'];
export type OrganizationListSortDirection =
  NonNullable<ListOrganizationsQuery>['sortDirection'];
export type OrganizationListSort = {
  sortBy: OrganizationListSortBy;
  sortDirection: OrganizationListSortDirection;
};

export type OrganizationFormValues = {
  name: string;
  ownerUserId: string;
  status: OrganizationStatus;
  slug: string;
  contactEmail: string;
  contactPhone: string;
  address: {
    postalCode: string;
    city: string;
    district: string;
    streetAddress: string;
  };
};
