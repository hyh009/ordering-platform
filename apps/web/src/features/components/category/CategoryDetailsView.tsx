import { useAppTranslation } from '@/app/i18n';
import type { Category } from '@/models/category';
import type { SupportedLocale } from '@/models/metadata';
import { ReadOnlyField } from '@/shared/components/form/ReadOnlyField';
import { LocalizedStringView } from '@/shared/components/LocalizedStringView';

type CategoryDetailsViewProps = {
  category: Category;
  defaultLocale: SupportedLocale;
};

export function CategoryDetailsView({
  category,
  defaultLocale,
}: CategoryDetailsViewProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="grid gap-4">
      <ReadOnlyField label={tDefault('merchant.categories.name', 'Name')}>
        <LocalizedStringView
          highlightLocale={defaultLocale}
          value={category.name}
        />
      </ReadOnlyField>
      <ReadOnlyField
        label={tDefault('merchant.categories.descriptionLabel', 'Description')}
      >
        <LocalizedStringView
          highlightLocale={defaultLocale}
          value={category.description ?? {}}
        />
      </ReadOnlyField>
      <ReadOnlyField label={tDefault('merchant.categories.status', 'Status')}>
        {category.isActive
          ? tDefault('merchant.categories.active', 'Active')
          : tDefault('merchant.categories.inactive', 'Inactive')}
      </ReadOnlyField>
    </div>
  );
}
