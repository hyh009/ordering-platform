import { describe, expect, it } from 'vitest';
import { storeFrontMenuModel } from './model';
import type { PublicStoreDto } from '@repo/shared';

function storeDto(partial: Partial<PublicStoreDto> = {}): PublicStoreDto {
  return {
    id: 'store-1',
    displayName: { en: 'Corner Cafe' },
    locale: {
      defaultLocale: 'en',
      supportedLocales: ['en'],
    },
    businessHours: [],
    serviceFeeRate: 0,
    orderModes: [],
    ...partial,
  };
}

describe('storeFrontMenuModel', () => {
  it('preserves public store image urls', () => {
    const store = storeFrontMenuModel.deserializeStore(
      storeDto({
        logoUrl: 'https://example.com/logo.png',
        bannerUrl: 'https://example.com/banner.png',
      }),
    );

    expect(store.logoUrl).toBe('https://example.com/logo.png');
    expect(store.bannerUrl).toBe('https://example.com/banner.png');
  });
});
