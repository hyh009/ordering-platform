import { describe, expect, it } from 'vitest';
import { formatBusinessHours } from './display';
import type { BusinessHourDto } from './types';

const tDefault = (_key: string, defaultText: string) => defaultText;

function businessHour(overrides: Partial<BusinessHourDto>): BusinessHourDto {
  return {
    dayOfWeek: 0,
    isOpen: true,
    openTime: '09:00',
    closeTime: '21:00',
    ...overrides,
  };
}

describe('store display helpers', () => {
  it('formats the all-day marker as 24 hours', () => {
    expect(
      formatBusinessHours(
        businessHour({ openTime: '00:00', closeTime: '00:00' }),
        tDefault,
      ),
    ).toBe('24 hours');
  });

  it('formats regular business hours as an open-close range', () => {
    expect(
      formatBusinessHours(
        businessHour({ openTime: '10:30', closeTime: '22:00' }),
        tDefault,
      ),
    ).toBe('10:30 – 22:00');
  });
});
