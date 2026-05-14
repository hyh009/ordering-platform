import { tDefault } from '@/app/i18n';
import { feedbackStore } from '../stores/feedback.store';

import type {
  ActiveConfirmModal,
  FeedbackTone,
} from '../stores/feedback.store';

type ToastInput = {
  tone?: FeedbackTone;
  title?: string;
  message: string;
};

type ConfirmInput = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: FeedbackTone;
};

class FeedbackVM {
  private nextToastId = 1;

  toast = (input: ToastInput) => {
    const toast = {
      id: `toast-${this.nextToastId}`,
      tone: input.tone ?? 'info',
      title: input.title,
      message: input.message,
    };

    this.nextToastId += 1;

    feedbackStore.setState((state) => ({
      toasts: [...state.toasts, toast],
    }));

    return toast.id;
  };

  dismissToast = (toastId: string) => {
    feedbackStore.setState((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== toastId),
    }));
  };

  confirm = (input: ConfirmInput) => {
    return new Promise<boolean>((resolve) => {
      const modal: ActiveConfirmModal = {
        title: input.title,
        message: input.message,
        confirmLabel:
          input.confirmLabel ?? tDefault('common.actions.confirm', 'Confirm'),
        cancelLabel:
          input.cancelLabel ?? tDefault('common.actions.cancel', 'Cancel'),
        tone: input.tone ?? 'info',
        onResolve: resolve,
      };

      feedbackStore.setState({
        modal,
      });
    });
  };

  closeModal = (confirmed: boolean) => {
    const modal = feedbackStore.getState().modal;

    if (!modal) {
      return;
    }

    feedbackStore.setState({
      modal: null,
    });
    modal.onResolve(confirmed);
  };
}

export const feedbackVM = new FeedbackVM();
