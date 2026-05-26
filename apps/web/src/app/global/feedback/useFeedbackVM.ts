import { useStore } from 'zustand';
import { feedbackCommands } from './feedback.commands';
import { feedbackStore } from './feedback.store';

export function useFeedbackVM() {
  const toasts = useStore(feedbackStore, (state) => state.toasts);
  const modal = useStore(feedbackStore, (state) => state.modal);

  return {
    toasts,
    modal,
    confirm: feedbackCommands.confirm,
    closeModal: feedbackCommands.closeModal,
    dismissToast: feedbackCommands.dismissToast,
  };
}
