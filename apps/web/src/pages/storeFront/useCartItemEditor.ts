import { useCallback, useMemo, useState } from 'react';
import { useStore } from 'zustand';

import { useAppTranslation } from '@/app/i18n';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';

import { canEditCartItem, resolveCartItemEdit } from './cartItemEdit';
import { handleStoreFrontFailure } from './storeFrontFailureFeedback';

import type { Cart, CartItem, UpdateCartItemRequest } from '@/models/cart';
import type { StoreFrontCommandFailure } from '@/services/utils/storeFrontApiError';

type CartItemEditorCommands = {
  /** Makes sure the menu is in the storefront store; a no-op when it is. */
  ensureMenuLoaded(
    storeId: string,
  ): Promise<{ status: 'loaded' } | StoreFrontCommandFailure>;
  updateItem(
    storeId: string,
    itemId: string,
    request: UpdateCartItemRequest,
  ): Promise<{ status: 'updated' } | StoreFrontCommandFailure>;
};

/**
 * The flow for changing an item already in the cart, shared by the two surfaces
 * that list cart items — the cart page and the assistant's cart panel — so the
 * guest meets one editor, not two that drift apart.
 *
 * Only WHICH item is open is kept. What the picker shows is resolved from the
 * cart and the menu on every render, so an item that leaves the cart while it is
 * open — removed on another device, or merged into an identical line by the
 * save itself — simply closes the editor. There is no "item not found" to show
 * for a save that worked.
 */
export function useCartItemEditor(input: {
  storeId: string;
  cart: Cart | null;
  participantId: string | null;
  commands: CartItemEditorCommands;
}) {
  const { storeId, cart, participantId, commands } = input;
  const { tDefault } = useAppTranslation();
  const runtime = getStoreFrontRuntime();

  const activeStoreId = useStore(
    runtime.stores.tenant,
    (state) => state.activeStoreId,
  );
  const rawMenu = useStore(runtime.stores.storefront, (state) => state.menu);
  const menu = activeStoreId === storeId ? rawMenu : null;

  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const target = useMemo(() => {
    if (editingItemId === null || !cart || !menu) return null;

    const item = cart.items.find((candidate) => candidate.id === editingItemId);
    if (!item) return null;

    const resolution = resolveCartItemEdit({ item, participantId, menu });

    return resolution.status === 'editable' ? resolution.target : null;
  }, [cart, editingItemId, menu, participantId]);

  const startEdit = useCallback(
    async (item: CartItem) => {
      if (!canEditCartItem(item, participantId)) return;

      // The cart page can be opened without the menu ever having been loaded
      // (a refresh lands straight on it), and the picker needs the product's
      // choices.
      const loaded = await commands.ensureMenuLoaded(storeId);
      if (loaded.status === 'failed') {
        handleStoreFrontFailure(loaded);
        return;
      }

      const loadedMenu = runtime.stores.storefront.getState().menu;
      const resolution = loadedMenu
        ? resolveCartItemEdit({ item, participantId, menu: loadedMenu })
        : { status: 'unavailable' as const };

      if (resolution.status === 'unavailable') {
        // Presented as the failure it is, through the area's one helper, with
        // wording for this case: the generic "not found" would not tell the
        // guest the item can still be removed.
        handleStoreFrontFailure({
          status: 'failed',
          reason: 'not-found',
          message: tDefault(
            'guest.cart.editUnavailable',
            'This item is no longer on the menu, so it cannot be changed. You can still remove it.',
          ),
        });
        return;
      }

      if (resolution.status === 'editable') {
        setEditingItemId(item.id);
      }
    },
    [commands, participantId, runtime, storeId, tDefault],
  );

  const cancelEdit = useCallback(() => {
    setEditingItemId(null);
  }, []);

  const saveEdit = useCallback(
    async (request: UpdateCartItemRequest) => {
      if (editingItemId === null) return;

      const result = await commands.updateItem(storeId, editingItemId, request);

      if (result.status === 'updated') {
        // The cart came back with the response. If this line merged into an
        // identical earlier one its id is gone, which is the save succeeding.
        setEditingItemId(null);
        return;
      }

      handleStoreFrontFailure(result);

      // Gone before the save reached it: nothing left to edit. Any other
      // failure leaves the picker open, so the guest keeps what they chose.
      if (result.reason === 'not-found') {
        setEditingItemId(null);
      }
    },
    [commands, editingItemId, storeId],
  );

  return {
    editingCartItem: target,
    startCartItemEdit: startEdit,
    cancelCartItemEdit: cancelEdit,
    saveCartItemEdit: saveEdit,
  };
}
