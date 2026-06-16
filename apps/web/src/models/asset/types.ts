import { storeImageKinds } from '@repo/shared';

export { storeImageKinds };

export type StoreImageKind = (typeof storeImageKinds)[number];

export type UploadedImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};
