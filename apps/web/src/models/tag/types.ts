import type {
  CreateTagRequest,
  CreateTagSuccessResponse,
  ListTagsSuccessResponse,
  LocalizedStringDto,
  TagActiveFilter,
  TagDto,
  UpdateTagRequest,
  UpdateTagSuccessResponse,
} from '@repo/shared';

export type {
  CreateTagRequest,
  CreateTagSuccessResponse,
  ListTagsSuccessResponse,
  LocalizedStringDto,
  TagActiveFilter,
  TagDto,
  UpdateTagRequest,
  UpdateTagSuccessResponse,
};

export type Tag = {
  id: string;
  storeId: string;
  name: LocalizedStringDto;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
