import type {
  OffsetPaginationDto,
  StoreDto,
  StoreListItemDto,
  StoreStatus,
} from '@repo/shared';

export type { StoreStatus };

export type Store = StoreDto;
export type StoreListItem = StoreListItemDto;
export type StoreListPage = OffsetPaginationDto;
