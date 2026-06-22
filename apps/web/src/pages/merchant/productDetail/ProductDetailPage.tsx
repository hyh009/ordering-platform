import { ChevronLeft } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { ProductDetailsView } from '@/features/merchant/menu/products/components/ProductDetailsView';
import { ProductBasicInfoFields } from '@/features/merchant/menu/products/components/productForm/ProductBasicInfoFields';
import { ProductImageField } from '@/features/merchant/menu/products/components/productForm/ProductImageField';
import { ProductMetadataFields } from '@/features/merchant/menu/products/components/productForm/ProductMetadataFields';
import { ProductModifiersField } from '@/features/merchant/menu/products/components/productForm/ProductModifiersField';
import { ProductPreviewCard } from '@/features/merchant/menu/products/components/productForm/ProductPreviewCard';
import { ProductSummaryCard } from '@/features/merchant/menu/products/components/productForm/ProductSummaryCard';
import { LoadingState } from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { useProductDetailPageVM } from './useProductDetailPageVM';

export function ProductDetailPage() {
  const { tDefault } = useAppTranslation();
  const vm = useProductDetailPageVM();
  const { form, product } = vm;

  if (vm.isLoading && !product) {
    return (
      <LoadingState
        label={tDefault('merchant.products.loading', 'Loading product')}
      />
    );
  }

  if (!product) {
    return (
      <section className="admin-page-content">
        <Button onClick={vm.goBack} size="sm" type="button" variant="ghost">
          <ChevronLeft className="size-4" />
          {tDefault('merchant.products.title', 'Menu')}
        </Button>
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {vm.error ??
            tDefault('merchant.errors.notFound', 'This record was not found.')}
        </p>
      </section>
    );
  }

  return (
    <section className="admin-page-content">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button onClick={vm.goBack} size="sm" type="button" variant="ghost">
          <ChevronLeft className="size-4" />
          {tDefault('merchant.products.title', 'Menu')}
        </Button>

        {!vm.isEditMode ? (
          <div className="flex gap-2">
            <Button
              onClick={() => void vm.toggleSoldOut()}
              type="button"
              variant={product.isSoldOut ? 'destructive' : 'secondary'}
            >
              {product.isSoldOut
                ? tDefault('merchant.products.markAvailable', 'Mark available')
                : tDefault('merchant.products.markSoldOut', 'Mark sold out')}
            </Button>
            {vm.canManage ? (
              <Button onClick={vm.enterEditMode} type="button">
                {tDefault('common.actions.edit', 'Edit')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <h1 className="mb-6 text-3xl leading-tight font-bold md:text-4xl">
        {vm.pageTitle ||
          tDefault('merchant.products.untitled', 'Untitled product')}
      </h1>

      {form.submitError ? (
        <p className="mb-5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {form.submitError}
        </p>
      ) : null}

      {vm.isEditMode ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-6">
              <ProductBasicInfoFields form={form} locale={vm.locale} />
              <ProductMetadataFields form={form} formOptions={vm.formOptions} />
              <ProductModifiersField form={form} formOptions={vm.formOptions} />
              <ProductImageField
                form={form}
                onInvalidFile={vm.handleInvalidImageFile}
                onRemove={form.removeProductImage}
                onSelect={form.setPendingImageFile}
              />
            </div>

            <aside className="grid h-fit gap-6 lg:sticky lg:top-6">
              <ProductPreviewCard locale={vm.locale} values={form.values} />
              <ProductSummaryCard
                status={product.status}
                values={form.values}
              />
            </aside>
          </div>

          <div className="mt-6 flex gap-2">
            {product.status === 'draft' ? (
              <>
                <Button
                  disabled={form.isSubmitting}
                  onClick={() => void vm.publish()}
                  type="button"
                >
                  {vm.submittingStatus === 'published'
                    ? tDefault('common.actions.saving', 'Saving...')
                    : tDefault('merchant.products.publish', 'Publish')}
                </Button>
                <Button
                  disabled={form.isSubmitting}
                  onClick={() => void vm.saveDraft()}
                  type="button"
                  variant="secondary"
                >
                  {vm.submittingStatus === 'draft'
                    ? tDefault('common.actions.saving', 'Saving...')
                    : tDefault('merchant.products.saveDraft', 'Save draft')}
                </Button>
              </>
            ) : (
              <Button
                disabled={form.isSubmitting}
                onClick={() => void vm.saveCurrent()}
                type="button"
              >
                {form.isSubmitting
                  ? tDefault('common.actions.saving', 'Saving...')
                  : tDefault('common.actions.save', 'Save')}
              </Button>
            )}
            <Button
              disabled={form.isSubmitting}
              onClick={vm.cancelEdit}
              type="button"
              variant="ghost"
            >
              {tDefault('common.actions.cancel', 'Cancel')}
            </Button>
          </div>
        </>
      ) : (
        <ProductDetailsView
          locale={vm.locale}
          product={product}
          formOptions={vm.formOptions}
        />
      )}
    </section>
  );
}
