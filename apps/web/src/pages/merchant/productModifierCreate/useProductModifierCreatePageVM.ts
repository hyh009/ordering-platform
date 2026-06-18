import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { handleMerchantFailure } from '../merchantFailureFeedback';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { useActiveStoreLocale } from '@/app/global/activeStore/useActiveStoreLocale';
import { PATHS } from '@/app/routing/paths';
import {
  useProductModifierForm,
  toProductModifierRequest,
} from '@/features/merchant/menu/productModifiers/components/productModifierForm/useProductModifierForm';
import { createProductModifierCreatePageCommands } from './productModifierCreatePage.commands';

const productModifierCreatePageCommands =
  createProductModifierCreatePageCommands();

export function useProductModifierCreatePageVM() {
  const navigate = useNavigate();
  const storeId = useStore(activeStoreStore, (state) => state.storeId);
  const locale = useActiveStoreLocale();
  const form = useProductModifierForm();

  const goBack = useCallback(() => {
    void navigate(PATHS.MERCHANT.MODIFIERS);
  }, [navigate]);

  const submitModifier = useCallback(async () => {
    if (!storeId) return;

    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const request = toProductModifierRequest(form.values);
    const result = await productModifierCreatePageCommands.createModifier(
      storeId,
      request,
    );

    form.setIsSubmitting(false);

    if (result.status === 'created') {
      void navigate(PATHS.MERCHANT.MODIFIER_DETAIL_BUILD(result.modifier.id));
      return;
    }

    handleMerchantFailure(result, {
      form: { setSubmitError: form.setSubmitError, setFieldErrors: form.setFieldErrors },
    });
  }, [form, navigate, storeId]);

  return {
    form,
    goBack,
    locale,
    submitModifier,
  };
}
