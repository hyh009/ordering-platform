import { useCallback, useMemo, useState } from 'react';

export type ReorderSaveResult =
  | { status: 'reordered' }
  | { status: 'failed'; message: string };

/**
 * @reusable
 * @description Drive a "reorder mode" state machine over a list of identified
 * items: enter/cancel, adjacent move up/down, and a submit that delegates to an
 * onSave callback.
 * @keywords reorder, sort order, move up down, drag, arrange, pending order
 */
export function useReorder<T extends { id: string }>(
  items: T[],
  onSave: (orderedIds: string[]) => Promise<ReorderSaveResult>,
): {
  isReorderMode: boolean;
  orderedItems: T[];
  isSubmitting: boolean;
  error: string | null;
  enter: () => void;
  cancel: () => void;
  move: (id: string, direction: 'up' | 'down') => void;
  save: () => Promise<void>;
} {
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderedItems = useMemo<T[]>(() => {
    if (!isReorderMode) return items;
    const byId = new Map(items.map((item) => [item.id, item]));
    return pendingOrder
      .map((id) => byId.get(id))
      .filter((item): item is T => item !== undefined);
  }, [isReorderMode, items, pendingOrder]);

  const enter = useCallback(() => {
    setPendingOrder(items.map((item) => item.id));
    setError(null);
    setIsReorderMode(true);
  }, [items]);

  const cancel = useCallback(() => {
    setIsReorderMode(false);
    setPendingOrder([]);
    setError(null);
  }, []);

  const move = useCallback((id: string, direction: 'up' | 'down') => {
    setPendingOrder((current) => {
      const index = current.indexOf(id);
      if (index === -1) return current;
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    const result = await onSave(pendingOrder);
    if (result.status === 'reordered') {
      setIsReorderMode(false);
      setPendingOrder([]);
    } else {
      setError(result.message);
    }
    setIsSubmitting(false);
  }, [isSubmitting, onSave, pendingOrder]);

  return {
    isReorderMode,
    orderedItems,
    isSubmitting,
    error,
    enter,
    cancel,
    move,
    save,
  };
}
