import { useAppTranslation } from '@/app/i18n';
import type {
  ProductModifier,
  ProductModifierActiveFilter,
} from '@/models/productModifier';
import { getLocalizedText } from '@/models/metadata';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { FilterSelect } from '@/shared/components/form/FilterSelect';
import { LoadingState } from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { useProductModifierListPageVM } from './useProductModifierListPageVM';

export function ProductModifierListPage() {
  const { tDefault } = useAppTranslation();
  const vm = useProductModifierListPageVM();

  const visibilityOptions: {
    label: string;
    value: ProductModifierActiveFilter;
  }[] = [
    {
      label: tDefault('merchant.productModifiers.activeOnly', 'Active'),
      value: 'true',
    },
    {
      label: tDefault('merchant.productModifiers.inactiveOnly', 'Inactive'),
      value: 'false',
    },
    { label: tDefault('merchant.productModifiers.all', 'All'), value: 'all' },
  ];

  const columns: DataTableColumn<ProductModifier>[] = [
    {
      key: 'name',
      header: tDefault('merchant.productModifiers.name', 'Name'),
      className: 'pl-4',
      render: (modifier) => (
        <span className="truncate font-semibold">
          {getLocalizedText(modifier.name)}
        </span>
      ),
    },
    {
      key: 'selectionType',
      header: tDefault('merchant.productModifiers.selectionType', 'Type'),
      render: (modifier) =>
        modifier.selectionType === 'single_choice'
          ? tDefault('merchant.productModifiers.singleChoice', 'Single choice')
          : tDefault(
              'merchant.productModifiers.multipleChoice',
              'Multiple choice',
            ),
    },
    {
      key: 'select',
      header: tDefault('merchant.productModifiers.selectRange', 'Select'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (modifier) =>
        modifier.selectionType === 'single_choice'
          ? modifier.minSelect === 1
            ? tDefault('merchant.productModifiers.required', 'Required')
            : tDefault('common.optional', 'Optional')
          : `${modifier.minSelect} – ${modifier.maxSelect}`,
    },
    {
      key: 'optionsCount',
      header: tDefault('merchant.productModifiers.options', 'Options'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (modifier) => String(modifier.options.length),
    },
    {
      key: 'status',
      header: tDefault('merchant.productModifiers.status', 'Status'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (modifier) =>
        modifier.isActive
          ? tDefault('merchant.productModifiers.active', 'Active')
          : tDefault('merchant.productModifiers.inactive', 'Inactive'),
    },
  ];

  if (vm.isLoading && vm.productModifiers.length === 0) {
    return (
      <LoadingState
        label={tDefault(
          'merchant.productModifiers.loading',
          'Loading modifiers',
        )}
      />
    );
  }

  return (
    <section className="admin-page-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
            {tDefault('merchant.productModifiers.title', 'Modifiers')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'merchant.productModifiers.description',
              'Define option groups customers choose from when ordering.',
            )}
          </p>
        </div>
        {vm.canManage ? (
          <Button onClick={vm.openCreate} type="button">
            {tDefault('merchant.productModifiers.create', 'Create modifier')}
          </Button>
        ) : null}
      </div>

      {vm.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        data={vm.productModifiers}
        isLoading={vm.isLoading}
        labels={{
          empty: tDefault(
            'merchant.productModifiers.empty',
            'No modifiers found.',
          ),
        }}
        onRowClick={vm.openModifier}
        rowKey={(modifier) => modifier.id}
        toolbar={
          <FilterSelect
            onChange={vm.setFilter}
            options={visibilityOptions}
            value={vm.filter}
          />
        }
      />
    </section>
  );
}
