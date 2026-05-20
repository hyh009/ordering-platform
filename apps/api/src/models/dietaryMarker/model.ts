export { dietaryMarkerTypes } from '@repo/shared';

import type { DietaryMarkerType } from '@repo/shared';
import type { LocalizedString } from '@src/models/common/model';

export type { DietaryMarkerType };

export type DietaryMarkerEntity = {
  id: string;
  key: string;
  name: LocalizedString;
  icon?: string;
  type: DietaryMarkerType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
