// Cloudinary folder layout for store-scoped assets. Centralized so every upload
// site agrees on where a store's images live; route handlers must not hardcode
// these path strings.
const STORE_ASSET_ROOT = 'stores';

function storeAssetFolder(storeId: string, subfolder: string): string {
  return `${STORE_ASSET_ROOT}/${storeId}/${subfolder}`;
}

export const storeAssetFolders = {
  branding: (storeId: string) => storeAssetFolder(storeId, 'branding'),
  menuProducts: (storeId: string) => storeAssetFolder(storeId, 'menu-products'),
};
