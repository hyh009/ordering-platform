import type {
  AvailabilityRule,
  LocalizedString,
} from '@src/models/common/model';

export type CategoryEntity = {
  id: string;
  organizationId: string;
  name: LocalizedString;
  description?: LocalizedString;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  availabilityRules: AvailabilityRule[];
  createdAt: Date;
  updatedAt: Date;
};
