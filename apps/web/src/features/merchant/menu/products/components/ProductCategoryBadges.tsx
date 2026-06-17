import { useAppTranslation } from '@/app/i18n';
import { Badge } from '@/shared/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

type Props = {
  names: string[];
  maxVisible?: number;
};

/**
 * Renders a product's categories as compact badges. When there are more than
 * `maxVisible`, the remainder collapses into a `+N` badge whose hover tooltip
 * lists every category.
 */
export function ProductCategoryBadges({ names, maxVisible = 2 }: Props) {
  const { tDefault } = useAppTranslation();

  if (names.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        {tDefault('merchant.products.uncategorized', 'Uncategorized')}
      </span>
    );
  }

  const visible = names.slice(0, maxVisible);
  const overflowCount = names.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((name) => (
        <Badge key={name} variant="secondary">
          {name}
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
                {names.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
