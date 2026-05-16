import type { LocalizedString } from '@src/models/common/model';

export const dietaryMarkerTypes = ['dietary', 'regulatory'] as const;

export type DietaryMarkerType = (typeof dietaryMarkerTypes)[number];

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
