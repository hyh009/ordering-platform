import { useCallback, useEffect, useRef, useState } from 'react';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { tDefault } from '@/app/i18n';

/**
 * Copies text to the clipboard and exposes a transient `copied` flag that
 * resets after `resetMs`. The reset timer is cleared on unmount and before each
 * new copy, so the flag never lands on an unmounted component.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const copy = useCallback(
    async (text: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        clear();
        timerRef.current = window.setTimeout(() => setCopied(false), resetMs);
      } catch {
        feedbackCommands.toast({
          tone: 'error',
          message: tDefault('common.copyFailed', 'Could not copy.'),
        });
      }
    },
    [clear, resetMs],
  );

  return { copied, copy };
}
