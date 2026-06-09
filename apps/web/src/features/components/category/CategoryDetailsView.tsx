import { useAppTranslation } from '@/app/i18n';
import type { Category } from '@/models/category';
import { ReadOnlyField } from '@/shared/components/form/ReadOnlyField';
import { LocalizedStringView } from '@/shared/components/LocalizedStringView';

type CategoryDetailsViewProps = {
  category: Category;
};

export function CategoryDetailsView({ category }: CategoryDetailsViewProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="grid gap-4">
      <ReadOnlyField label={tDefault('merchant.categories.name', 'Name')}>
        <LocalizedStringView value={category.name} />
      </ReadOnlyField>
      <ReadOnlyField
        label={tDefault('merchant.categories.descriptionLabel', 'Description')}
      >
        <LocalizedStringView value={category.description ?? {}} />
      </ReadOnlyField>
      <ReadOnlyField label={tDefault('merchant.categories.status', 'Status')}>
        {category.isActive
          ? tDefault('merchant.categories.active', 'Active')
          : tDefault('merchant.categories.inactive', 'Inactive')}
      </ReadOnlyField>
    </div>
  );
}
