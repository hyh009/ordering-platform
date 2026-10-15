import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import { createGuestSessionStore } from '@/app/global/guestSession/guestSession.store';
import { storeFrontCartService } from '@/services/storeFrontCart.service';
import { createTenantStore } from '../tenant/store';
import { createStoreFrontCartActions } from './actions';
import { createStoreFrontCartCommands } from './commands';
import { createStoreFrontCartStore } from './store';
import type { Cart } from '@/models/cart';

vi.mock('@/services/storeFrontCart.service', () => ({
  storeFrontCartService: {
    getCart: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    submitCart: vi.fn(),
  },
}));

describe('storefront cart commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a token from another store before calling the service', async () => {
    const cartStore = createStoreFrontCartStore();
    const sessionStore = createGuestSessionStore();
    const tenantStore = createTenantStore();
    sessionStore.setState({
      guestToken: 'token-a',
      participantId: 'participant-a',
      storeId: 'store-a',
    });
    tenantStore.setState({ activeStoreId: 'store-b' });
    const commands = createStoreFrontCartCommands({
      cartActions: createStoreFrontCartActions(cartStore),
      cartStore,
      sessionStore,
      tenantStore,
    });

    await expect(commands.loadCart('store-b')).resolves.toEqual({
      status: 'failed',
      message: '',
      reason: 'session-store-mismatch',
    });
    expect(storeFrontCartService.getCart).not.toHaveBeenCalled();
    expect(cartStore.getState().isLoading).toBe(false);
  });

  // At most 99 of one product, counted across every line whatever the options.
  describe('the per-product quantity limit', () => {
    const addItemMock = vi.mocked(storeFrontCartService.addItem);
    const updateItemMock = vi.mocked(storeFrontCartService.updateItem);

    function cartWith(
      items: { id: string; productId: string; quantity: number }[],
    ): Cart {
      return { id: 'cart-1', items } as unknown as Cart;
    }

    function setup(cart: Cart) {
      const cartStore = createStoreFrontCartStore();
      const sessionStore = createGuestSessionStore();
      const tenantStore = createTenantStore();
      sessionStore.setState({
        guestToken: 'token-a',
        participantId: 'participant-a',
        storeId: 'store-a',
      });
      tenantStore.setState({ activeStoreId: 'store-a' });
      cartStore.setState({ cart });
      addItemMock.mockResolvedValue(cart);
      updateItemMock.mockResolvedValue(cart);

      return {
        cartStore,
        commands: createStoreFrontCartCommands({
          cartActions: createStoreFrontCartActions(cartStore),
          cartStore,
          sessionStore,
          tenantStore,
        }),
      };
    }

    // 3 with one set of options and 90 with another: 93 of the one product.
    const twoLines = cartWith([
      { id: 'line-1', productId: 'tea', quantity: 3 },
      { id: 'line-2', productId: 'tea', quantity: 90 },
    ]);

    it('sends an add that lands exactly on 99', async () => {
      const { commands } = setup(twoLines);

      await expect(
        commands.addItem('store-a', { productId: 'tea', quantity: 6 }),
      ).resolves.toEqual({ status: 'updated' });
      expect(addItemMock).toHaveBeenCalledTimes(1);
    });

    it('does not send an add that would make 100', async () => {
      const { commands, cartStore } = setup(twoLines);

      await expect(
        commands.addItem('store-a', { productId: 'tea', quantity: 7 }),
      ).resolves.toMatchObject({ status: 'failed', reason: 'quantity-limit' });
      expect(addItemMock).not.toHaveBeenCalled();
      // Refused before anything started, so the cart is not left "mutating".
      expect(cartStore.getState().isMutating).toBe(false);
      expect(cartStore.getState().error).toBeNull();
    });

    it('lets another product through while one is full', async () => {
      const { commands } = setup(
        cartWith([{ id: 'line-1', productId: 'tea', quantity: 99 }]),
      );

      await expect(
        commands.addItem('store-a', { productId: 'cake', quantity: 1 }),
      ).resolves.toEqual({ status: 'updated' });
    });

    it('sends a quantity change that lands exactly on 99', async () => {
      const { commands } = setup(twoLines);

      await expect(
        commands.updateItem('store-a', 'line-1', { quantity: 9 }),
      ).resolves.toEqual({ status: 'updated' });
      expect(updateItemMock).toHaveBeenCalledWith('token-a', 'line-1', {
        quantity: 9,
      });
    });

    it('does not send a quantity change that would make 100', async () => {
      const { commands } = setup(twoLines);

      await expect(
        commands.updateItem('store-a', 'line-1', { quantity: 10 }),
      ).resolves.toMatchObject({ status: 'failed', reason: 'quantity-limit' });
      expect(updateItemMock).not.toHaveBeenCalled();
    });

    it('always sends an edit that leaves the quantity alone', async () => {
      const { commands } = setup(
        cartWith([{ id: 'line-1', productId: 'tea', quantity: 99 }]),
      );
      const request = {
        selectedOptions: [{ modifierId: 'sugar', optionId: 'half' }],
      };

      await expect(
        commands.updateItem('store-a', 'line-1', request),
      ).resolves.toEqual({ status: 'updated' });
      expect(updateItemMock).toHaveBeenCalledWith('token-a', 'line-1', request);
    });

    it('lets a guest reduce a cart that is already over', async () => {
      const { commands } = setup(
        cartWith([
          { id: 'line-1', productId: 'tea', quantity: 99 },
          { id: 'line-2', productId: 'tea', quantity: 20 },
        ]),
      );

      await expect(
        commands.updateItem('store-a', 'line-2', { quantity: 19 }),
      ).resolves.toEqual({ status: 'updated' });
    });
  });

  // The server refuses a submit whose prices changed, and has already repriced
  // the cart, so the guest must see the new prices before submitting again.
  describe('a submit refused for a price change', () => {
    const submitCartMock = vi.mocked(storeFrontCartService.submitCart);
    const getCartMock = vi.mocked(storeFrontCartService.getCart);

    function setup() {
      const cartStore = createStoreFrontCartStore();
      const sessionStore = createGuestSessionStore();
      const tenantStore = createTenantStore();
      sessionStore.setState({
        guestToken: 'token-a',
        participantId: 'participant-a',
        storeId: 'store-a',
      });
      tenantStore.setState({ activeStoreId: 'store-a' });
      cartStore.setState({
        cart: { id: 'cart-1', subtotal: 360 } as unknown as Cart,
      });

      return {
        cartStore,
        commands: createStoreFrontCartCommands({
          cartActions: createStoreFrontCartActions(cartStore),
          cartStore,
          sessionStore,
          tenantStore,
        }),
      };
    }

    it('re-reads the cart so the store holds the repriced lines', async () => {
      const repriced = { id: 'cart-1', subtotal: 400 } as unknown as Cart;
      submitCartMock.mockRejectedValue(
        new ApiError({
          statusCode: 409,
          code: 'PRICE_CHANGED',
          message: 'Some prices have changed',
        }),
      );
      getCartMock.mockResolvedValue(repriced);
      const { commands, cartStore } = setup();

      await expect(commands.submitCart('store-a', {})).resolves.toMatchObject({
        status: 'failed',
        reason: 'price-changed',
      });
      expect(getCartMock).toHaveBeenCalledWith('token-a');
      expect(cartStore.getState().cart).toBe(repriced);
      expect(cartStore.getState().isMutating).toBe(false);
    });

    it('does not re-read the cart for other failures', async () => {
      submitCartMock.mockRejectedValue(
        new ApiError({
          statusCode: 400,
          code: 'PRODUCT_SOLD_OUT',
          message: 'Some items are no longer available',
        }),
      );
      const { commands } = setup();

      await commands.submitCart('store-a', {});

      expect(getCartMock).not.toHaveBeenCalled();
    });
  });
});
