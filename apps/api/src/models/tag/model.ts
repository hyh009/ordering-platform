import type { LocalizedString } from '@src/models/common/model';

export type TagEntity = {
  id: string;
  organizationId: string;
  storeId: string;
  name: LocalizedString;
  color?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
