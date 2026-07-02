import { useCallback, useMemo } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { getLocalizedText, languageToLocale } from '@/models/metadata';
import type { Product, ProductActiveFilter } from '@/models/product';
import {
  ProductCategoryBadges,
  type ProductCategoryBadgeItem,
} from '@/features/merchant/menu/products/components/ProductCategoryBadges';
import { ProductStatusBadge } from '@/features/merchant/menu/products/components/ProductStatusBadge';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { FilterSelect } from '@/shared/components/form/FilterSelect';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { useProductListPageVM } from './useProductListPageVM';

export function ProductListPage() {
  const { language, tDefault } = useAppTranslation();
  const displayLocale = languageToLocale(language);
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
          getLocalizedText(category.name, displayLocale),
        ]),
      ),
    [vm.categories, displayLocale],
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

  const resolveCategories = useCallback(
    (product: Product): ProductCategoryBadgeItem[] => {
      const ids = new Set(product.categoryIds);
      const items: ProductCategoryBadgeItem[] = [];
      for (const [id, name] of categoryNameById) {
        if (ids.has(id)) items.push({ id, name });
      }
      return items;
    },
    [categoryNameById],
  );

  const nameColumn: DataTableColumn<Product> = {
    key: 'name',
    header: tDefault('merchant.products.name', 'Name'),
    className: 'pl-4',
    render: (product) => (
      <span className="truncate font-semibold">
        {getLocalizedText(product.name, displayLocale)}
      </span>
    ),
  };

  const categoryColumn: DataTableColumn<Product> = {
    key: 'category',
    header: tDefault('merchant.products.category', 'Category'),
    render: (product) => (
      <ProductCategoryBadges categories={resolveCategories(product)} />
    ),
  };

  const priceColumn: DataTableColumn<Product> = {
    key: 'price',
    header: tDefault('merchant.products.price', 'Price'),
    cellClassName: 'text-sm text-muted-foreground',
    render: (product) => product.price.toFixed(2),
  };

  const columns: DataTableColumn<Product>[] = [
    nameColumn,
    categoryColumn,
    priceColumn,
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
            ? tDefault('merchant.products.soldOut', 'Sold out')
            : tDefault('merchant.products.available', 'Available')}
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

  const reorderColumns: DataTableColumn<Product>[] = [
    nameColumn,
    categoryColumn,
    priceColumn,
    {
      key: 'reorderActions',
      header: '',
      align: 'right',
      className: 'pr-4',
      render: (product) => {
        const isFirst = vm.products[0]?.id === product.id;
        const isLast = vm.products[vm.products.length - 1]?.id === product.id;

        return (
          <div className="flex justify-end gap-1">
            <Button
              disabled={isFirst}
              onClick={() => vm.moveProduct(product.id, 'up')}
              size="sm"
              title={tDefault('merchant.products.moveUp', 'Move up')}
              type="button"
              variant="ghost"
            >
              ↑
            </Button>
            <Button
              disabled={isLast}
              onClick={() => vm.moveProduct(product.id, 'down')}
              size="sm"
              title={tDefault('merchant.products.moveDown', 'Move down')}
              type="button"
              variant="ghost"
            >
              ↓
            </Button>
          </div>
        );
      },
    },
  ];

  if (vm.isLoading && vm.products.length === 0) {
    return (
      <LoadingState
        label={tDefault('merchant.products.loading', 'Loading products')}
      />
    );
  }

  const toolbar = vm.isReorderMode ? (
    <div className="flex gap-2">
      <Button
        disabled={vm.isReorderSubmitting}
        onClick={vm.cancelReorder}
        type="button"
        variant="ghost"
      >
        {tDefault('common.actions.cancel', 'Cancel')}
      </Button>
      <Button
        disabled={vm.isReorderSubmitting}
        onClick={() => void vm.saveReorder()}
        type="button"
      >
        {vm.isReorderSubmitting
          ? tDefault('common.actions.saving', 'Saving...')
          : tDefault('merchant.products.saveOrder', 'Save order')}
      </Button>
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        className="bg-white"
        onChange={vm.setCategoryFilter}
        options={categoryOptions}
        value={vm.categoryFilter}
      />
      <FilterSelect
        className="bg-white"
        onChange={vm.setFilter}
        options={visibilityOptions}
        value={vm.filter}
      />
      {vm.canReorder ? (
        <Button onClick={vm.enterReorderMode} type="button" variant="secondary">
          {tDefault('merchant.products.reorder', 'Reorder')}
        </Button>
      ) : null}
    </div>
  );

  return (
    <section className="admin-page-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
            {tDefault('merchant.products.title', 'Menu')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'merchant.products.listDescription',
              'Create and manage the products customers can order.',
            )}
          </p>
        </div>
        {vm.canManage && !vm.isReorderMode ? (
          <Button onClick={vm.openCreate} type="button">
            {tDefault('merchant.products.create', 'Create product')}
          </Button>
        ) : null}
      </div>

      {vm.reorderError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.reorderError}
        </p>
      ) : null}

      {vm.error && vm.products.length === 0 ? (
        <ErrorState message={vm.error} onRetry={vm.retry} />
      ) : (
        <DataTable
          columns={vm.isReorderMode ? reorderColumns : columns}
          data={vm.products}
          isLoading={vm.isLoading}
          labels={{
            empty: tDefault('merchant.products.empty', 'No products found.'),
            search: tDefault(
              'merchant.products.searchPlaceholder',
              'Search products…',
            ),
          }}
          onSearchChange={vm.isReorderMode ? undefined : vm.setSearch}
          rowKey={(product) => product.id}
          search={vm.search}
          toolbar={toolbar}
        />
      )}
    </section>
  );
}
