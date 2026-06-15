import { apiJson } from '.';

// Storefront endpoints use a guest token instead of the merchant session,
// so they always skip the 401-refresh and 403-revalidate flows.
const storeFrontOptions = { skipRefresh: true, skipRevalidate: true } as const;

export function storeFrontApiJson<TData>(
  path: string,
  guestToken: string,
  init?: RequestInit,
): Promise<TData> {
  return apiJson<TData>(
    path,
    {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${guestToken}` },
    },
    storeFrontOptions,
  );
}
