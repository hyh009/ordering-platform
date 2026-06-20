import { ChevronLeft } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { ProductBasicInfoFields } from '@/features/merchant/menu/products/components/productForm/ProductBasicInfoFields';
import { ProductImageField } from '@/features/merchant/menu/products/components/productForm/ProductImageField';
import { ProductMetadataFields } from '@/features/merchant/menu/products/components/productForm/ProductMetadataFields';
import { ProductModifiersField } from '@/features/merchant/menu/products/components/productForm/ProductModifiersField';
import { ProductPreviewCard } from '@/features/merchant/menu/products/components/productForm/ProductPreviewCard';
import { ProductSummaryCard } from '@/features/merchant/menu/products/components/productForm/ProductSummaryCard';
import { Button } from '@/shared/components/ui/button';
import { useProductCreatePageVM } from './useProductCreatePageVM';

export function ProductCreatePage() {
  const { tDefault } = useAppTranslation();
  const vm = useProductCreatePageVM();
  const { form } = vm;

  return (
    <section className="admin-page-content">
      <div className="mb-6 flex items-center gap-3">
        <Button onClick={vm.goBack} size="sm" type="button" variant="ghost">
          <ChevronLeft className="size-4" />
          {tDefault('merchant.products.title', 'Menu')}
        </Button>
      </div>

      <h1 className="mb-6 text-3xl leading-tight font-bold md:text-4xl">
        {tDefault('merchant.products.createTitle', 'Create product')}
      </h1>

      {form.submitError ? (
        <p className="mb-5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {form.submitError}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6">
          <ProductBasicInfoFields form={form} locale={vm.locale} />
          <ProductMetadataFields form={form} formOptions={vm.formOptions} />
          <ProductModifiersField form={form} formOptions={vm.formOptions} />
          <ProductImageField
            form={form}
            onRemove={form.removeProductImage}
            onSelect={form.setPendingImageFile}
          />
        </div>

        <aside className="grid h-fit gap-6 lg:sticky lg:top-6">
          <ProductPreviewCard locale={vm.locale} values={form.values} />
          <ProductSummaryCard status="draft" values={form.values} />
        </aside>
      </div>

      <div className="mt-6 flex gap-2">
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
        <Button
          disabled={form.isSubmitting}
          onClick={vm.goBack}
          type="button"
          variant="ghost"
        >
          {tDefault('common.actions.cancel', 'Cancel')}
        </Button>
      </div>
    </section>
  );
}
