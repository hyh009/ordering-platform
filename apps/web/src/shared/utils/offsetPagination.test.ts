import { describe, expect, it } from 'vitest';
import {
  getNextOffset,
  getOffsetForPage,
  getOffsetPageInfo,
  getPageNumberWindow,
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

  it('computes the offset for a 1-based page number', () => {
    expect(getOffsetForPage({ limit: 20, page: 1 })).toBe(0);
    expect(getOffsetForPage({ limit: 20, page: 3 })).toBe(40);
    expect(getOffsetForPage({ limit: 20, page: 0 })).toBe(0);
  });

  it('builds the first page-number window', () => {
    expect(getPageNumberWindow({ page: 3, totalPages: 25 })).toEqual({
      pages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      hasPreviousWindow: false,
      hasNextWindow: true,
      previousWindowPage: 1,
      nextWindowPage: 11,
    });
  });

  it('builds a later page-number window clamped to total pages', () => {
    expect(getPageNumberWindow({ page: 13, totalPages: 23 })).toEqual({
      pages: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      hasPreviousWindow: true,
      hasNextWindow: true,
      previousWindowPage: 1,
      nextWindowPage: 21,
    });

    expect(getPageNumberWindow({ page: 22, totalPages: 23 })).toEqual({
      pages: [21, 22, 23],
      hasPreviousWindow: true,
      hasNextWindow: false,
      previousWindowPage: 11,
      nextWindowPage: 23,
    });
  });
});
