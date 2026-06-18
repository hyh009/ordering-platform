import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { handleMerchantFailure } from '../merchantFailureFeedback';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { useActiveStoreLocale } from '@/app/global/activeStore/useActiveStoreLocale';
import { PATHS } from '@/app/routing/paths';
import {
  toCreateProductRequest,
  useProductForm,
} from '@/features/merchant/menu/products/components/productForm/useProductForm';
import { useProductFormOptions } from '@/features/merchant/menu/products/components/productForm/useProductFormOptions';
import type { ProductStatus } from '@/models/product';
import { createProductCreatePageCommands } from './productCreatePage.commands';

const productCreatePageCommands = createProductCreatePageCommands();

export function useProductCreatePageVM() {
  const navigate = useNavigate();
  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const locale = useActiveStoreLocale();
  const form = useProductForm();
  const formOptions = useProductFormOptions(storeId, locale.defaultLocale);
  const [submittingStatus, setSubmittingStatus] = useState<ProductStatus | null>(
    null,
  );

  const goBack = useCallback(() => {
    void navigate(PATHS.MERCHANT.MENU);
  }, [navigate]);

  const submit = useCallback(
    async (status: ProductStatus) => {
      if (!storeId) return;

      form.setIsSubmitting(true);
      form.setSubmitError(null);
      setSubmittingStatus(status);

      const request = toCreateProductRequest(form.values, status);
      const result = await productCreatePageCommands.createProduct(
        storeId,
        request,
      );

      form.setIsSubmitting(false);
      setSubmittingStatus(null);

      if (result.status === 'created') {
        void navigate(PATHS.MERCHANT.MENU_DETAIL_BUILD(result.product.id));
        return;
      }

      handleMerchantFailure(result, {
        form: { setSubmitError: form.setSubmitError, setFieldErrors: form.setFieldErrors },
      });
    },
    [form, navigate, storeId],
  );

  const saveDraft = useCallback(() => submit('draft'), [submit]);
  const publish = useCallback(() => submit('published'), [submit]);

  return {
    form,
    goBack,
    locale,
    publish,
    formOptions,
    saveDraft,
    submittingStatus,
  };
}
