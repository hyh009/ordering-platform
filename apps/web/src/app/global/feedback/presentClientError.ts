import { presentFeedback } from './presentFeedback';

// How a purely client-side error (no API command, no `reason`) is surfaced.
// These never go through an area's failure table; the call site picks the kind.
export type ClientErrorPresentation = 'toast' | 'modal';

// Single entry point for client-side operation errors such as a failed canvas
// crop, clipboard write, or file read. Delegates to `presentFeedback` so toast
// and modal behavior stay defined in one place. Defaults to a transient toast;
// pass `'modal'` when the user must acknowledge before continuing.
export function presentClientError(
  message: string,
  kind: ClientErrorPresentation = 'toast',
): void {
  presentFeedback(kind, message);
}
