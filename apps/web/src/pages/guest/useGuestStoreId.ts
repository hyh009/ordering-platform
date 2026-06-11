import { useParams } from 'react-router';

/** Reads the `:storeId` route param shared by every guest page. */
export function useGuestStoreId(): string {
  const { storeId } = useParams<{ storeId: string }>();
  return storeId ?? '';
}
