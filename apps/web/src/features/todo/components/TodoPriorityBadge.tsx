import { useAppTranslation } from '@/app/i18n';
import { getTodoPriorityLabel } from '@/app/i18n/todoLabels';
import { cn } from '@/shared/utils/cn';
import type { TodoPriority } from '@/models/todo.types';

type TodoPriorityBadgeProps = {
  priority: TodoPriority;
};

const priorityClassName: Record<TodoPriority, string> = {
  low: 'border-secondary bg-secondary text-secondary-foreground',
  medium: 'border-accent bg-accent text-accent-foreground',
  high: 'border-destructive/30 bg-destructive/10 text-destructive',
};

export function TodoPriorityBadge({ priority }: TodoPriorityBadgeProps) {
  const { tDefault } = useAppTranslation();
  const label = getTodoPriorityLabel(tDefault, priority);

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-xs leading-none font-bold whitespace-nowrap',
        priorityClassName[priority],
      )}
    >
      {label}
    </span>
  );
}
