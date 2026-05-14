import { useStore } from 'zustand';
import { feedbackStore } from '../stores/feedback.store';
import { feedbackVM } from './feedback.vm';

export function useFeedbackVM() {
  const toasts = useStore(feedbackStore, (state) => state.toasts);
  const modal = useStore(feedbackStore, (state) => state.modal);

  return {
    toasts,
    modal,
    actions: feedbackVM,
  };
}
