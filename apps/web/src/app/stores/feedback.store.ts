import { createStore } from 'zustand/vanilla';

export type FeedbackTone = 'info' | 'success' | 'error';

export type ToastItem = {
  id: string;
  tone: FeedbackTone;
  message: string;
  title?: string;
};

export type ActiveConfirmModal = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: FeedbackTone;
  onResolve: (confirmed: boolean) => void;
};

export type FeedbackState = {
  toasts: ToastItem[];
  modal: ActiveConfirmModal | null;
};

export const feedbackStore = createStore<FeedbackState>(() => ({
  toasts: [],
  modal: null,
}));
