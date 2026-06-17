import type { To } from 'react-router';
import { PATHS } from './paths';

/**
 * Shared contract for returning to the merchant menu list with its filter query
 * preserved. The list page stashes its search via {@link buildMenuReturnState}
 * when opening a product; the detail page rebuilds the return location with
 * {@link resolveMenuReturnTo}.
 */
export type MenuReturnState = {
  menuSearch: string;
};

export function buildMenuReturnState(search: string): MenuReturnState {
  return { menuSearch: search };
}

export function resolveMenuReturnTo(state: unknown): To {
  const menuSearch = (state as MenuReturnState | null)?.menuSearch ?? '';
  return { pathname: PATHS.MERCHANT.MENU, search: menuSearch };
}
