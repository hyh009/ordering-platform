import { describe, expect, it } from 'vitest';
import { i18n, tDefault } from '@/app/i18n';

describe('i18n', () => {
  it('uses the default string when a translation key is missing', () => {
    expect(tDefault('missing.key', 'Default fallback')).toBe(
      'Default fallback',
    );
  });

  it('can switch to a supported language', async () => {
    await i18n.changeLanguage('zh-TW');

    expect(tDefault('common.actions.cancel', 'Cancel')).toBe('取消');

    await i18n.changeLanguage('en');
  });
});
