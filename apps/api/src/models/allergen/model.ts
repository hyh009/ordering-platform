import type { LocalizedString } from '@src/models/common/model';

export type AllergenEntity = {
  id: string;
  key: string;
  name: LocalizedString;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
