const STORAGE_KEY_PREFIX = 'sf_lang_';

export function getStorefrontLangKey(storeId: string): string {
  return `${STORAGE_KEY_PREFIX}${storeId}`;
}
