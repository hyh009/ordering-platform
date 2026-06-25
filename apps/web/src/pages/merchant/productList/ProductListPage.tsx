import { useCallback, useMemo } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { useActiveStoreLocale } from '@/app/global/activeStore/useActiveStoreLocale';
import { getLocalizedText } from '@/models/metadata';
import type { Product, ProductActiveFilter } from '@/models/product';
import { ProductCategoryBadges } from '@/features/merchant/menu/products/components/ProductCategoryBadges';
import { ProductStatusBadge } from '@/features/merchant/menu/products/components/ProductStatusBadge';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { FilterSelect } from '@/shared/components/form/FilterSelect';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { useProductListPageVM } from './useProductListPageVM';

export function ProductListPage() {
  const { tDefault } = useAppTranslation();
  const locale = useActiveStoreLocale();
  const vm = useProductListPageVM();

  const visibilityOptions: { label: string; value: ProductActiveFilter }[] = [
    { label: tDefault('merchant.products.activeOnly', 'Active'), value: 'true' },
    {
      label: tDefault('merchant.products.inactiveOnly', 'Inactive'),
      value: 'false',
    },
    { label: tDefault('merchant.products.all', 'All'), value: 'all' },
  ];

  const categoryNameById = useMemo(
    () =>
      new Map(
        vm.categories.map((category) => [
          category.id,
          getLocalizedText(category.name, locale.defaultLocale),
        ]),
      ),
    [vm.categories, locale.defaultLocale],
  );

  const categoryOptions = useMemo(
    () => [
      {
        label: tDefault('merchant.products.allCategories', 'All categories'),
        value: 'all',
      },
      ...[...categoryNameById].map(([value, label]) => ({ label, value })),
    ],
    [categoryNameById, tDefault],
  );

  const resolveCategoryNames = useCallback(
    (product: Product) => {
      const ids = new Set(product.categoryIds);
      const names: string[] = [];
      for (const [id, name] of categoryNameById) {
        if (ids.has(id)) names.push(name);
      }
      return names;
    },
    [categoryNameById],
  );

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      header: tDefault('merchant.products.name', 'Name'),
      className: 'pl-4',
      render: (product) => (
        <span className="truncate font-semibold">
          {getLocalizedText(product.name, locale.defaultLocale)}
        </span>
      ),
    },
    {
      key: 'category',
      header: tDefault('merchant.products.category', 'Category'),
      render: (product) => (
        <ProductCategoryBadges names={resolveCategoryNames(product)} />
      ),
    },
    {
      key: 'price',
      header: tDefault('merchant.products.price', 'Price'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (product) => product.price.toFixed(2),
    },
    {
      key: 'status',
      header: tDefault('merchant.products.statusLabel', 'Status'),
      render: (product) => <ProductStatusBadge status={product.status} />,
    },
    {
      key: 'active',
      header: tDefault('merchant.products.visibility', 'Visibility'),
      cellClassName: 'text-sm text-muted-foreground',
      render: (product) =>
        product.isActive
          ? tDefault('merchant.products.visible', 'Visible')
          : tDefault('merchant.products.hidden', 'Hidden'),
    },
    {
      key: 'soldOut',
      header: tDefault('merchant.products.soldOut', 'Sold out'),
      render: (product) => (
        <Button
          onClick={() => void vm.toggleSoldOut(product)}
          size="sm"
          type="button"
          variant={product.isSoldOut ? 'destructive' : 'ghost'}
        >
          {product.isSoldOut
            ? tDefault('merchant.products.markAvailable', 'Sold out')
            : tDefault('merchant.products.markSoldOut', 'Available')}
        </Button>
      ),
    },
    {
      key: 'actions',
      header: tDefault('common.table.actions', 'Actions'),
      align: 'right',
      className: 'pr-4',
      render: (product) => (
        <Button
          onClick={() => vm.openProduct(product)}
          size="sm"
          type="button"
          variant="secondary"
        >
          {vm.canManage
            ? tDefault('common.actions.edit', 'Edit')
            : tDefault('common.actions.view', 'View')}
        </Button>
      ),
    },
  ];

  if (vm.isLoading && vm.products.length === 0) {
    return (
      <LoadingState
        label={tDefault('merchant.products.loading', 'Loading products')}
      />
    );
  }

  return (
    <section className="admin-page-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
            {tDefault('merchant.products.title', 'Menu')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'merchant.products.description',
              'Create and manage the products customers can order.',
            )}
          </p>
        </div>
        {vm.canManage ? (
          <Button onClick={vm.openCreate} type="button">
            {tDefault('merchant.products.create', 'Create product')}
          </Button>
        ) : null}
      </div>

      {vm.error && vm.products.length === 0 ? (
        <ErrorState message={vm.error} onRetry={vm.retry} />
      ) : (
        <DataTable
          columns={columns}
          data={vm.products}
          isLoading={vm.isLoading}
          labels={{
            empty: tDefault('merchant.products.empty', 'No products found.'),
          }}
          rowKey={(product) => product.id}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                onChange={vm.setCategoryFilter}
                options={categoryOptions}
                value={vm.categoryFilter}
              />
              <FilterSelect
                onChange={vm.setFilter}
                options={visibilityOptions}
                value={vm.filter}
              />
            </div>
          }
        />
      )}
    </section>
  );
}
