import { mongoValidationMessages } from '@src/models/common/validationMessages';
import { Schema } from 'mongoose';

import type { AvailabilityRule, TimeWindow } from '@src/models/common/model';

export const timeWindowSchema = new Schema<TimeWindow>(
  {
    start: {
      type: String,
      required: true,
      trim: true,
    },
    end: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

// AvailabilityRule arrays model restrictions only. An empty array means the
// owning layer has no restrictions and is available all day.
export const availabilityRuleSchema = new Schema<AvailabilityRule>(
  {
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    daysOfWeek: {
      type: [Number],
      validate: {
        validator(value: number[] | null | undefined) {
          return (
            !value ||
            value.every((dayOfWeek) => dayOfWeek >= 0 && dayOfWeek <= 6)
          );
        },
        message: mongoValidationMessages.daysOfWeekRange,
      },
    },
    timeWindows: {
      type: [timeWindowSchema],
      default: [],
    },
  },
  { _id: false },
);
