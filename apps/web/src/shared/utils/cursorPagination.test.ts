import { describe, expect, it } from 'vitest';
import { getCursorPageInfo } from './cursorPagination';

describe('cursor pagination utils', () => {
  it('has a next page when the next cursor is present', () => {
    expect(getCursorPageInfo({ nextCursor: 'cursor-1' })).toEqual({
      hasNextPage: true,
    });
  });

  it('does not have a next page when the next cursor is null', () => {
    expect(getCursorPageInfo({ nextCursor: null })).toEqual({
      hasNextPage: false,
    });
  });
});
