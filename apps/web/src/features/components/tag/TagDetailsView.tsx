import { useAppTranslation } from '@/app/i18n';
import type { SupportedLocale } from '@/models/metadata';
import type { Tag } from '@/models/tag';
import { ReadOnlyField } from '@/shared/components/form/ReadOnlyField';
import { LocalizedStringView } from '@/shared/components/LocalizedStringView';

type TagDetailsViewProps = {
  tag: Tag;
  defaultLocale: SupportedLocale;
};

export function TagDetailsView({ tag, defaultLocale }: TagDetailsViewProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="grid gap-4">
      <ReadOnlyField label={tDefault('merchant.tags.name', 'Name')}>
        <LocalizedStringView highlightLocale={defaultLocale} value={tag.name} />
      </ReadOnlyField>
      <ReadOnlyField label={tDefault('merchant.tags.color', 'Color')}>
        {tag.color ? (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: tag.color }}
            />
            {tag.color}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </ReadOnlyField>
      <ReadOnlyField label={tDefault('merchant.tags.status', 'Status')}>
        {tag.isActive
          ? tDefault('merchant.tags.active', 'Active')
          : tDefault('merchant.tags.inactive', 'Inactive')}
      </ReadOnlyField>
    </div>
  );
}
