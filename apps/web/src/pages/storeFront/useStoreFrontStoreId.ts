import { useParams } from 'react-router';

/** Reads the `:storeId` route param shared by every storefront page. */
export function useStoreFrontStoreId(): string {
  const { storeId } = useParams<{ storeId: string }>();
  return storeId ?? '';
}
