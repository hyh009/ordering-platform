import { useAppTranslation } from '@/app/i18n';
import type { ProductStatus } from '@/models/product';
import { Badge } from '@/shared/components/ui/badge';

type Props = {
  status: ProductStatus;
};

/**
 * Soft status pill with a leading status dot. Published reads as a light green
 * pill; draft as a neutral muted pill.
 */
export function ProductStatusBadge({ status }: Props) {
  const { tDefault } = useAppTranslation();

  const isPublished = status === 'published';

  return (
    <Badge
      className={
        isPublished
          ? 'gap-1.5 bg-emerald-50 text-emerald-700'
          : 'gap-1.5 bg-muted text-muted-foreground'
      }
    >
      <span
        className={`inline-block size-1.5 rounded-full ${
          isPublished ? 'bg-emerald-500' : 'bg-muted-foreground/60'
        }`}
      />
      {isPublished
        ? tDefault('merchant.products.published', 'Published')
        : tDefault('merchant.products.draft', 'Draft')}
    </Badge>
  );
}
