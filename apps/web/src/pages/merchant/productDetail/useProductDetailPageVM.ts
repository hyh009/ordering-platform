import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import { handleMerchantFailure } from '../merchantFailureFeedback';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { useActiveStoreLocale } from '@/app/global/activeStore/useActiveStoreLocale';
import { tDefault } from '@/app/i18n';
import { resolveMenuReturnTo } from '@/app/routing/menuReturnState';
import { createProductDetailRuntime } from '@/features/merchant/menu/products/detail/runtime';
import {
  toUpdateProductRequest,
  useProductForm,
  valuesFromProduct,
} from '@/features/merchant/menu/products/components/productForm/useProductForm';
import { useProductFormOptions } from '@/features/merchant/menu/products/components/productForm/useProductFormOptions';
import {
  getImageFileValidationMessage,
  type ImageFileValidationError,
} from '@/models/asset';
import { getLocalizedText } from '@/models/metadata';
import type { ProductStatus } from '@/models/product';
import { createProductDetailPageCommands } from './productDetailPage.commands';

function createDetailPageContext() {
  const { actions, store } = createProductDetailRuntime();
  const commands = createProductDetailPageCommands(actions);

  return { commands, store };
}

export function useProductDetailPageVM() {
  const [{ commands, store }] = useState(createDetailPageContext);
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const canManage = useCanManageStoreResources();
  const locale = useActiveStoreLocale();
  const formOptions = useProductFormOptions(storeId, locale.defaultLocale);

  const product = useStore(store, (state) => state.product);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const [isEditMode, setIsEditMode] = useState(false);
  const [submittingStatus, setSubmittingStatus] =
    useState<ProductStatus | null>(null);

  const form = useProductForm();

  const enterEditMode = useCallback(() => {
    if (!product) return;
    form.reset(valuesFromProduct(product));
    setIsEditMode(true);
  }, [form, product]);

  const cancelEdit = useCallback(() => {
    if (product) form.reset(valuesFromProduct(product));
    setIsEditMode(false);
  }, [form, product]);

  const handleInvalidImageFile = useCallback(
    (reason: ImageFileValidationError) => {
      handleMerchantFailure({
        reason: 'invalid',
        status: 'failed',
        message: getImageFileValidationMessage(reason, tDefault),
      });
    },
    [],
  );

  const load = useCallback(async () => {
    if (!storeId || !productId) return;

    await commands.loadProduct(storeId, productId);
  }, [commands, productId, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (status: ProductStatus) => {
      if (!storeId || !productId) return;

      form.setIsSubmitting(true);
      form.resetErrors();
      setSubmittingStatus(status);

      let imageUrl = form.values.imageUrl;

      if (form.pendingImageFile) {
        const uploadResult = await commands.uploadProductImage(
          storeId,
          form.pendingImageFile,
        );

        if (uploadResult.status !== 'uploaded') {
          form.setIsSubmitting(false);
          setSubmittingStatus(null);
          handleMerchantFailure(uploadResult);
          return;
        }

        imageUrl = uploadResult.image.url;
      }

      const request = toUpdateProductRequest({ ...form.values, imageUrl }, status);
      const result = await commands.updateProduct(storeId, productId, request);

      form.setIsSubmitting(false);
      setSubmittingStatus(null);

      if (result.status === 'saved') {
        setIsEditMode(false);
        return;
      }

      handleMerchantFailure(result, {
        form: {
          setSubmitError: form.setSubmitError,
          setFieldErrors: form.setFieldErrors,
        },
      });
    },
    [commands, form, productId, storeId],
  );

  const saveDraft = useCallback(() => save('draft'), [save]);
  const publish = useCallback(() => save('published'), [save]);
  const saveCurrent = useCallback(() => {
    if (product) void save(product.status);
  }, [product, save]);

  const toggleSoldOut = useCallback(async () => {
    if (!storeId || !productId || !product) return;

    const result = await commands.toggleSoldOut(
      storeId,
      productId,
      !product.isSoldOut,
    );
    if (result.status === 'failed') {
      handleMerchantFailure(result);
    }
  }, [commands, product, productId, storeId]);

  const goBack = useCallback(() => {
    void navigate(resolveMenuReturnTo(location.state));
  }, [location.state, navigate]);

  const pageTitle = useMemo(
    () => (product ? getLocalizedText(product.name, locale.defaultLocale) : ''),
    [locale.defaultLocale, product],
  );

  return {
    canManage,
    cancelEdit,
    enterEditMode,
    error,
    form,
    goBack,
    handleInvalidImageFile,
    isEditMode,
    isLoading,
    locale,
    pageTitle,
    product,
    publish,
    retry,
    formOptions,
    saveCurrent,
    saveDraft,
    submittingStatus,
    toggleSoldOut,
  };
}
