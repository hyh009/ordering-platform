import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import { useCanManageStoreResources } from '@/app/global/activeOrg/useActiveOrgRole';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { useActiveStoreLocale } from '@/app/global/activeStore/useActiveStoreLocale';
import { resolveMenuReturnTo } from '@/app/routing/menuReturnState';
import { createProductDetailRuntime } from '@/features/merchant/menu/products/detail/runtime';
import {
  toUpdateProductRequest,
  useProductForm,
  valuesFromProduct,
} from '@/features/merchant/menu/products/components/productForm/useProductForm';
import { useProductFormOptions } from '@/features/merchant/menu/products/components/productForm/useProductFormOptions';
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
  const [submittingStatus, setSubmittingStatus] = useState<ProductStatus | null>(
    null,
  );
  const form = useProductForm();

  const load = useCallback(async () => {
    if (!storeId || !productId) return;

    await commands.loadProduct(storeId, productId);
  }, [commands, productId, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const enterEditMode = useCallback(() => {
    if (product) form.reset(valuesFromProduct(product));
    setIsEditMode(true);
  }, [form, product]);

  const cancelEdit = useCallback(() => {
    setIsEditMode(false);
    if (product) form.reset(valuesFromProduct(product));
  }, [form, product]);

  const save = useCallback(
    async (status: ProductStatus) => {
      if (!storeId || !productId) return;

      form.setIsSubmitting(true);
      form.setSubmitError(null);
      setSubmittingStatus(status);

      const request = toUpdateProductRequest(form.values, status);
      const result = await commands.updateProduct(storeId, productId, request);

      form.setIsSubmitting(false);
      setSubmittingStatus(null);

      if (result.status === 'saved') {
        setIsEditMode(false);
        return;
      }

      form.setFieldErrors(result.fieldErrors ?? {});
      form.setSubmitError(result.message);
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

    await commands.toggleSoldOut(storeId, productId, !product.isSoldOut);
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
    isEditMode,
    isLoading,
    locale,
    pageTitle,
    product,
    publish,
    formOptions,
    saveCurrent,
    saveDraft,
    submittingStatus,
    toggleSoldOut,
  };
}
