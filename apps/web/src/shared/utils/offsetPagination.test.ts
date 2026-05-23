import { describe, expect, it } from 'vitest';
import {
  getNextOffset,
  getOffsetPageInfo,
  getPreviousOffset,
} from './offsetPagination';

describe('offset pagination utils', () => {
  it('returns page info for a middle page', () => {
    expect(
      getOffsetPageInfo({
        limit: 20,
        offset: 40,
        total: 95,
      }),
    ).toEqual({
      hasNextPage: true,
      hasPreviousPage: true,
      page: 3,
      totalPages: 5,
    });
  });

  it('keeps at least one total page for empty lists', () => {
    expect(
      getOffsetPageInfo({
        limit: 20,
        offset: 0,
        total: 0,
      }),
    ).toEqual({
      hasNextPage: false,
      hasPreviousPage: false,
      page: 1,
      totalPages: 1,
    });
  });

  it('calculates next and previous offsets', () => {
    const pagination = {
      limit: 20,
      offset: 40,
      total: 95,
    };

    expect(getNextOffset(pagination)).toBe(60);
    expect(getPreviousOffset(pagination)).toBe(20);
  });

  it('does not return a negative previous offset', () => {
    expect(
      getPreviousOffset({
        limit: 20,
        offset: 0,
        total: 95,
      }),
    ).toBe(0);
  });
});
