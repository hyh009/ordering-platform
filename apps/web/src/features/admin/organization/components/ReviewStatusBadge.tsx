import { useAppTranslation } from '@/app/i18n';
import { getOrganizationReviewStatusLabel } from '@/models/organization';
import { cn } from '@/shared/utils/cn';
import type { OrganizationReviewStatus } from '@/models/organization';

const colorMap: Record<OrganizationReviewStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export function ReviewStatusBadge({
  status,
}: {
  status: OrganizationReviewStatus;
}) {
  const { tDefault } = useAppTranslation();
  const label = getOrganizationReviewStatusLabel(status, tDefault);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        colorMap[status],
      )}
    >
      {label}
    </span>
  );
}
