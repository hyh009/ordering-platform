import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';

import { getStoreFrontRuntime } from '@/features/storeFront/runtime';

import { handleStoreFrontFailure } from '../storeFrontFailureFeedback';
import { buildAssistantPanelView } from './assistantPanelView';
import { createMenuPageCommands } from './menuPage.commands';

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
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(() => createMenuPageCommands(runtime), [runtime]);

  const state = useStore(runtime.stores.aiOrdering);
  const view = useMemo(
    () => buildAssistantPanelView({ state, isAvailable }),
    [state, isAvailable],
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

  const selectOption = useCallback(
    async (option: { id: string; label: string }) => {
      await send({ message: option.label, selectedOptionId: option.id });
    },
    [send],
  );

  const retryOperation = useCallback(
    async (operationId: string) => {
      const result = await commands.retryAssistantOperation(
        storeId,
        operationId,
      );

      // Only a session-scoped failure comes back here; an item-scoped one is
      // already written onto the row the guest is looking at.
      if (result.status !== 'applied') {
        handleStoreFrontFailure(result);
      }
    },
    [commands, storeId],
  );

  const dismissOperation = useCallback(
    (operationId: string) => {
      commands.dismissAssistantOperation(operationId);
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
    applyProposal,
    retryOperation,
    dismissOperation,
  };
}
