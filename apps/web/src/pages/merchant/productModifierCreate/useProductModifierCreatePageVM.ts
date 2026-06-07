import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { activeStoreStore } from '@/app/global/activeStore/activeStore.store';
import { PATHS } from '@/app/routing/paths';
import {
  useProductModifierForm,
  toProductModifierRequest,
} from '@/features/menu/productModifiers/components/productModifierForm/useProductModifierForm';
import { createProductModifierCreatePageCommands } from './productModifierCreatePage.commands';

const productModifierCreatePageCommands =
  createProductModifierCreatePageCommands();

export function useProductModifierCreatePageVM() {
  const navigate = useNavigate();
  const storeId = useStore(activeStoreStore, (state) => state.storeId);
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

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [form, navigate, storeId]);

  return {
    form,
    goBack,
    submitModifier,
  };
}
