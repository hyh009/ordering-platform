import { useAppTranslation } from '@/app/i18n';
import { Badge } from '@/shared/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { getCategoryColorClasses } from './categoryColor';

export type ProductCategoryBadgeItem = {
  id: string;
  name: string;
};

type Props = {
  categories: ProductCategoryBadgeItem[];
  maxVisible?: number;
};

/**
 * Renders a product's categories as compact color-coded badges. Each category
 * keeps a stable color derived from its id. When there are more than
 * `maxVisible`, the remainder collapses into a `+N` badge whose hover tooltip
 * lists every category.
 */
export function ProductCategoryBadges({ categories, maxVisible = 2 }: Props) {
  const { tDefault } = useAppTranslation();

  if (categories.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        {tDefault('merchant.products.uncategorized', 'Uncategorized')}
      </span>
    );
  }

  const visible = categories.slice(0, maxVisible);
  const overflowCount = categories.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((category) => (
        <Badge
          className={getCategoryColorClasses(category.id)}
          key={category.id}
        >
          {category.name}
        </Badge>
      ))}
      {overflowCount > 0 ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge className="cursor-default" variant="outline">
                  {`+${overflowCount}`}
                </Badge>
              }
            />
            <TooltipContent>
              <ul className="flex flex-col gap-0.5">
                {categories.map((category) => (
                  <li key={category.id}>{category.name}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
