import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { tDefault } from '@/app/i18n';
import { createOrganizationDetailRuntime } from '@/features/organization/detail/runtime';
import { useOrganizationForm } from '@/features/organization/components/organizationForm/useOrganizationForm';
import {
  toUpdateOrganizationRequest,
  valuesFromOrganization,
} from '@/models/organization';
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
  const feedbackVM = useFeedbackVM();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const organization = useStore(store, (state) => state.organization);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);
  const formattedAddress = organization?.address
    ? [
        organization.address.tw.postalCode,
        organization.address.tw.city,
        organization.address.tw.district,
        organization.address.tw.streetAddress,
      ]
        .filter(Boolean)
        .join('')
    : '';
  const displayContactPhone = organization?.contactPhone?.nationalNumber ?? '';

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

  const discardAndCloseEditModal = useCallback(() => {
    form.reset();
    setIsEditModalOpen(false);
  }, [form]);

  const closeEditModal = useCallback(async () => {
    if (!form.hasChanges()) {
      discardAndCloseEditModal();
      return;
    }

    const confirmed = await feedbackVM.confirm({
      title: tDefault(
        'common.confirmations.discardChangesTitle',
        'Discard changes?',
      ),
      message: tDefault(
        'common.confirmations.discardChangesMessage',
        'You have unsaved changes. Are you sure you want to discard them?',
      ),
    });

    if (confirmed) {
      discardAndCloseEditModal();
    }
  }, [discardAndCloseEditModal, form, feedbackVM]);

  const submitOrganization = useCallback(async () => {
    form.setIsSubmitting(true);
    form.setSubmitError(null);

    const result = await commands.saveOrganizationDetail(
      organizationId,
      toUpdateOrganizationRequest(form.values),
    );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      discardAndCloseEditModal();
      await loadOrganization(); // Re-fetch to show latest data
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [
    discardAndCloseEditModal,
    commands,
    form,
    organizationId,
    loadOrganization,
  ]);

  return {
    closeEditModal,
    error,
    displayContactPhone,
    formattedAddress,
    form,
    isEditModalOpen,
    isLoading,
    loadOrganization,
    openEditModal,
    organization,
    submitOrganization,
  };
}
