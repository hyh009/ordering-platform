import { afterEach, describe, expect, it, vi } from 'vitest';
import { organizationService } from './organization.service';

describe('organizationService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses request pagination defaults when the list response omits pagination', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'success',
            data: {
              organizations: [],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      organizationService.listOrganizations({
        limit: 20,
        offset: 0,
      }),
    ).resolves.toEqual({
      organizations: [],
      pagination: {
        limit: 20,
        offset: 0,
        total: 0,
      },
    });
  });
});
