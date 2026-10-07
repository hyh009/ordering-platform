import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';

import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { groupCartItemsByParticipant } from '@/models/cart';

import { handleStoreFrontFailure } from '../storeFrontFailureFeedback';
import { useCartItemEditor } from '../useCartItemEditor';
import { buildAssistantPanelView } from './assistantPanelView';
import { createMenuPageCommands } from './menuPage.commands';

import type { CartItem } from '@/models/cart';

/**
 * Owns the assistant panel's flow state: whether it is open, the draft message,
 * the auto-apply reaction, and failure presentation. The transcript itself is
 * feature state, read through the store.
 */
export function useAssistantPanelVM(input: {
  storeId: string;
  /** Deployment-level. False hides the entry point outright. */
  isAvailable: boolean;
}) {
  const { storeId, isAvailable } = input;
  const navigate = useNavigate();
  const { tDefault } = useAppTranslation();
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(() => createMenuPageCommands(runtime), [runtime]);

  const cartItemEditorCommands = useMemo(
    () => ({
      ensureMenuLoaded: commands.ensureMenuLoaded,
      updateItem: commands.updateCartItem,
    }),
    [commands],
  );

  const state = useStore(runtime.stores.aiOrdering);
  const view = useMemo(
    () => buildAssistantPanelView({ state, isAvailable }),
    [state, isAvailable],
  );

  // The same cart the menu page and the cart page read. The assistant shows the
  // cart rather than restating it, so there is no second source to keep in step
  // and the storefront SSE stream already keeps a shared cart current here.
  const activeStoreId = useStore(
    runtime.stores.tenant,
    (tenant) => tenant.activeStoreId,
  );
  const rawCart = useStore(runtime.stores.cart, (cart) => cart.cart);
  const rawIsMutatingCart = useStore(
    runtime.stores.cart,
    (cart) => cart.isMutating,
  );
  const rawParticipantId = useStore(
    runtime.stores.session,
    (session) => session.participantId,
  );

  // Guarded the same way the cart page guards it: while the active store is
  // handing over, another store's cart must not appear beside this conversation.
  const isActiveStore = activeStoreId === storeId;
  const cart = isActiveStore ? rawCart : null;
  const participantId = isActiveStore ? rawParticipantId : null;
  const isMutatingCart = isActiveStore && rawIsMutatingCart;

  const cartGroups = useMemo(
    () => groupCartItemsByParticipant(cart, participantId),
    [cart, participantId],
  );
  const cartTotals = useMemo(
    () =>
      cart
        ? {
            subtotal: cart.subtotal,
            serviceFeeAmount: cart.serviceFeeAmount,
            serviceFeeRate: cart.serviceFeeRate,
            totalAmount: cart.totalAmount,
          }
        : null,
    [cart],
  );
  const isCartEmpty = (cart?.items.length ?? 0) === 0;

  const changeCartItemQuantity = useCallback(
    async (item: CartItem, quantity: number) => {
      const result = await commands.updateCartItem(storeId, item.id, {
        quantity,
      });

      if (result.status === 'failed') {
        handleStoreFrontFailure(result);
      }
    },
    [commands, storeId],
  );

  // Changing an item's options from the cart beside the conversation. The same
  // editor the cart page opens, so a wrong sugar level is a tap here instead of
  // another message to the assistant.
  const cartItemEditor = useCartItemEditor({
    storeId,
    cart,
    participantId,
    commands: cartItemEditorCommands,
  });

  /**
   * Submitting is the guest's own action, reusing the cart page's confirmation and
   * command so there is one submission flow with one wording.
   *
   * This does not widen what the assistant can do: no assistant operation
   * submits, pays for, or closes an order. The guest presses this.
   */
  const submitCart = useCallback(async () => {
    const confirmed = await feedbackCommands.confirm({
      title: tDefault('guest.cart.submitConfirmTitle', 'Submit order?'),
      message: tDefault(
        'guest.cart.submitConfirmMessage',
        'Your order will be sent to the kitchen. You can keep adding items before payment.',
      ),
      confirmLabel: tDefault('guest.cart.submitConfirm', 'Submit'),
    });
    if (!confirmed) return;

    const result = await commands.submitCart(storeId, {});

    if (result.status === 'submitted') {
      // Leaving is correct: the cart the conversation was about has become an
      // order, so there is nothing left for the assistant to propose against.
      void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, result.orderId));
      return;
    }

    handleStoreFrontFailure(result);
  }, [commands, navigate, storeId, tDefault]);

  const removeCartItem = useCallback(
    async (item: CartItem) => {
      const result = await commands.removeCartItem(storeId, item.id);

      if (result.status === 'failed') {
        handleStoreFrontFailure(result);
      }
    },
    [commands, storeId],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');

  // The transcript is read on open rather than with the menu: a guest who never
  // opens the panel should not pay for a request they will not look at. The
  // command is idempotent per conversation, so reopening costs nothing.
  useEffect(() => {
    if (!isOpen || !isAvailable) return;

    void commands.loadAssistantConversation(storeId).then((result) => {
      if (result.status !== 'loaded') {
        handleStoreFrontFailure(result);
      }
    });
  }, [commands, isAvailable, isOpen, storeId]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const applyProposal = useCallback(async () => {
    const result = await commands.applyAssistantProposal(storeId);

    if (result.status !== 'applied') {
      handleStoreFrontFailure(result);
    }
  }, [commands, storeId]);

  const send = useCallback(
    async (input: { message: string; selectedOptionId?: string }) => {
      const message = input.message.trim();
      if (message.length === 0) return;

      const promptId = view.openPrompt?.promptId;

      setDraft('');

      const result = await commands.sendAssistantMessage(storeId, {
        message,
        ...(promptId !== undefined ? { responseToPromptId: promptId } : {}),
        ...(input.selectedOptionId !== undefined
          ? { selectedOptionId: input.selectedOptionId }
          : {}),
      });

      if (result.status !== 'sent') {
        handleStoreFrontFailure(result);
      }
    },
    [commands, storeId, view.openPrompt],
  );

  const submitDraft = useCallback(async () => {
    await send({ message: draft });
  }, [draft, send]);

  // Several questions answered at once travel as text: the picked labels in
  // question order. No option id goes with them, because an id names one
  // question's answer and this is an answer to all of them.
  const answerQuestions = useCallback(
    async (labels: string[]) => {
      const separator = labels.some((label) => /\p{Script=Han}/u.test(label))
        ? '、'
        : ', ';

      await send({ message: labels.join(separator) });
    },
    [send],
  );

  const selectOption = useCallback(
    async (option: { id: string; label: string }) => {
      await send({ message: option.label, selectedOptionId: option.id });
    },
    [send],
  );

  const dismissOperation = useCallback(
    (operationId: string) => {
      commands.dismissAssistantOperation(operationId);
    },
    [commands],
  );

  const answerProposalChoice = useCallback(
    (input: {
      operationId: string;
      modifierId: string;
      optionIds: string[];
    }) => {
      commands.answerAssistantProposalChoice(input);
    },
    [commands],
  );

  // Auto-apply, when the store AND the active version both allow it. The server
  // resolved that into `showsConfirmationControls`; the panel never decides it.
  // The ref keeps one proposal from being applied twice as the store re-renders.
  const autoAppliedProposalId = useRef<string | null>(null);

  useEffect(() => {
    const proposal = view.proposal;

    if (
      !proposal ||
      proposal.showsConfirmationControls ||
      proposal.isApplied ||
      !proposal.canApply ||
      autoAppliedProposalId.current === proposal.proposalId
    ) {
      return;
    }

    autoAppliedProposalId.current = proposal.proposalId;
    void applyProposal();
  }, [applyProposal, view.proposal]);

  return {
    ...view,
    isOpen,
    open,
    close,
    draft,
    setDraft,
    canSend: draft.trim().length > 0 && !view.isSending,
    submitDraft,
    selectOption,
    answerQuestions,
    applyProposal,
    dismissOperation,
    answerProposalChoice,
    cartGroups,
    cartTotals,
    isCartEmpty,
    isMutatingCart,
    changeCartItemQuantity,
    ...cartItemEditor,
    removeCartItem,
    submitCart,
  };
}
