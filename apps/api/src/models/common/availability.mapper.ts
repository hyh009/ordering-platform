import type { AvailabilityRule } from './model';
import type { AvailabilityRuleDto } from '@repo/shared';

export type AvailabilityRuleInput = {
  startDate?: string | undefined;
  endDate?: string | undefined;
  daysOfWeek?: number[] | undefined;
  timeWindows?: Array<{ start: string; end: string }> | undefined;
};

export function toAvailabilityRule(input: AvailabilityRuleInput) {
  const rule: AvailabilityRule = {};

  if (input.startDate !== undefined) {
    rule.startDate = new Date(input.startDate);
  }

  if (input.endDate !== undefined) {
    rule.endDate = new Date(input.endDate);
  }

  if (input.daysOfWeek !== undefined) {
    rule.daysOfWeek = input.daysOfWeek;
  }

  if (input.timeWindows !== undefined) {
    rule.timeWindows = input.timeWindows;
  }

  return rule;
}

export function toAvailabilityRuleDto(
  rule: AvailabilityRule,
): AvailabilityRuleDto {
  const dto: AvailabilityRuleDto = {};

  if (rule.startDate !== undefined) {
    dto.startDate = rule.startDate.toISOString();
  }

  if (rule.endDate !== undefined) {
    dto.endDate = rule.endDate.toISOString();
  }

  if (rule.daysOfWeek !== undefined) {
    dto.daysOfWeek = [...rule.daysOfWeek];
  }

  if (rule.timeWindows !== undefined) {
    dto.timeWindows = rule.timeWindows.map((window) => ({ ...window }));
  }

  return dto;
}
