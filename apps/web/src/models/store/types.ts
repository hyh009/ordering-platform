import type {
  CreateStoreRequest,
  OffsetPaginationDto,
  StoreCheckoutMode,
  StoreDto,
  StoreListItemDto,
  StoreLocaleDto,
  StoreOrderType,
  StoreStatus,
  UpdateStoreRequest,
} from '@repo/shared';

export type {
  CreateStoreRequest,
  StoreCheckoutMode,
  StoreLocaleDto,
  StoreOrderType,
  StoreStatus,
  UpdateStoreRequest,
};

export type Store = StoreDto;
export type StoreListItem = StoreListItemDto;
export type StoreListPage = OffsetPaginationDto;
