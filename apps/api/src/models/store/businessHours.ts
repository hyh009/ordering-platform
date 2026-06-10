import type { BusinessHour } from '@src/models/store/model';

// Stores do not carry a time zone yet; ordering currently assumes Taiwan.
// Promote to a store setting when multi-region stores appear.
export const STORE_TIME_ZONE = 'Asia/Taipei';

type LocalClock = {
  /** 0 (Sunday) - 6 (Saturday) */
  dayOfWeek: number;
  /** Minutes since local midnight. */
  minutes: number;
  /** Local calendar date as YYYY-MM-DD. */
  date: string;
};

const weekdayIndex: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getLocalClock(at: Date): LocalClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: STORE_TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    dayOfWeek: weekdayIndex[get('weekday')] ?? 0,
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
    date: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

function parseTimeToMinutes(time: string | undefined): number | undefined {
  if (time === undefined) return undefined;
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return undefined;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isOpenWithinEntry(
  entry: BusinessHour,
  minutes: number,
  isSpilloverFromPreviousDay: boolean,
): boolean {
  if (!entry.isOpen) return false;

  const open = parseTimeToMinutes(entry.openTime);
  const close = parseTimeToMinutes(entry.closeTime);

  if (open === undefined || close === undefined) {
    // Open all day when the entry has no explicit window.
    return !isSpilloverFromPreviousDay;
  }

  if (open < close) {
    return !isSpilloverFromPreviousDay && minutes >= open && minutes < close;
  }

  // Overnight window (e.g. 18:00-02:00): same day after open, or next day
  // before close.
  return isSpilloverFromPreviousDay ? minutes < close : minutes >= open;
}

export function isStoreOpenAt(
  businessHours: BusinessHour[],
  at: Date,
): boolean {
  const clock = getLocalClock(at);
  const previousDay = (clock.dayOfWeek + 6) % 7;

  return businessHours.some((entry) => {
    if (entry.dayOfWeek === clock.dayOfWeek) {
      return isOpenWithinEntry(entry, clock.minutes, false);
    }

    if (entry.dayOfWeek === previousDay) {
      return isOpenWithinEntry(entry, clock.minutes, true);
    }

    return false;
  });
}

export function getBusinessDate(at: Date): string {
  return getLocalClock(at).date;
}
