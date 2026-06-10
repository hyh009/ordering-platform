import { useAppTranslation } from '@/app/i18n';
import type { ProductStatus } from '@/models/product';
import { Badge } from '@/shared/components/ui/badge';

type Props = {
  status: ProductStatus;
};

export function ProductStatusBadge({ status }: Props) {
  const { tDefault } = useAppTranslation();

  return (
    <Badge variant={status === 'published' ? 'default' : 'outline'}>
      {status === 'published'
        ? tDefault('merchant.products.published', 'Published')
        : tDefault('merchant.products.draft', 'Draft')}
    </Badge>
  );
}
