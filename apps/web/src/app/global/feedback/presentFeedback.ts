import { tDefault } from '@/app/i18n';
import { feedbackCommands } from './feedback.commands';

// How a command failure is surfaced.
// - inline: belongs on the form that triggered it (handled by the form layer)
// - toast:  transient; the page stays usable
// - modal:  the user must acknowledge before continuing
// - silent: a control-flow signal with no user-facing message
export type FailurePresentation = 'toast' | 'modal' | 'inline' | 'silent';

// Global (non-form) feedback only: toast / modal / silent. This module never
// touches form state. An `inline` kind reaching here means there was no form to
// host the message, so it falls back to a toast rather than being dropped.
export function presentFeedback(
  kind: FailurePresentation,
  message: string,
): void {
  if (kind === 'silent' || !message) {
    return;
  }

  if (kind === 'modal') {
    void feedbackCommands.alert({
      title: tDefault('common.errors.title', 'Something went wrong'),
      message,
    });
    return;
  }

  // toast, and inline-without-a-form falls back here so the message is not lost.
  feedbackCommands.toast({ tone: 'error', message });
}
