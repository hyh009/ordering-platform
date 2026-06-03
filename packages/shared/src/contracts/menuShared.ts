import { z } from 'zod';

export type TimeWindowDto = {
  start: string;
  end: string;
};

export type AvailabilityRuleDto = {
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  timeWindows?: TimeWindowDto[];
};

export const timeWindowSchema = z.object({
  start: z.string().trim().min(1).max(16),
  end: z.string().trim().min(1).max(16),
});

export const availabilityRuleSchema = z.object({
  startDate: z.string().trim().datetime().optional(),
  endDate: z.string().trim().datetime().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  timeWindows: z.array(timeWindowSchema).optional(),
});
