import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { createOrganizationDetailRuntime } from '@/features/organization/detail/runtime';
import {
  toUpdateOrganizationRequest,
  useOrganizationForm,
  valuesFromOrganization,
} from '@/features/organization/components/organizationForm/useOrganizationForm';
import { createOrganizationDetailPageCommands } from './organizationDetailPage.commands';

function createOrganizationDetailPageContext() {
  const { actions, store } = createOrganizationDetailRuntime();
  const commands = createOrganizationDetailPageCommands(actions);

  return {
    commands,
    store,
  };
}

export function useOrganizationDetailPageVM(organizationId: string) {
  const [{ commands, store }] = useState(createOrganizationDetailPageContext);
  const form = useOrganizationForm();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const organization = useStore(store, (state) => state.organization);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  const loadOrganization = useCallback(async () => {
    await commands.loadOrganization(organizationId);
  }, [commands, organizationId]);

  useEffect(() => {
    void loadOrganization();
  }, [loadOrganization]);

  const openEditModal = useCallback(() => {
    if (!organization) {
      return;
    }

    form.reset(valuesFromOrganization(organization));
    setIsEditModalOpen(true);
  }, [form, organization]);

  const closeEditModal = useCallback(() => {
    form.reset();
    setIsEditModalOpen(false);
  }, [form]);

  const submitOrganization = useCallback(async () => {
    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result = await commands.saveOrganizationDetail(
      organizationId,
      toUpdateOrganizationRequest(form.values),
    );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      closeEditModal();
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [closeEditModal, commands, form, organizationId]);

  return {
    closeEditModal,
    error,
    form,
    isEditModalOpen,
    isLoading,
    loadOrganization,
    openEditModal,
    organization,
    submitOrganization,
  };
}
