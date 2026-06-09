import { cn } from '@/shared/utils/cn';
import type { StoreStatus } from '@/models/store';

type StoreStatusBadgeProps = {
  status: StoreStatus;
};

export function StoreStatusBadge({ status }: StoreStatusBadgeProps) {
  const isActive = status === 'active';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        isActive
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-rose-100 text-rose-700',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isActive ? 'bg-emerald-500' : 'bg-rose-500',
        )}
      />
      {status}
    </span>
  );
}
