import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { tDefault } from '@/app/i18n';
import { createOrganizationDetailRuntime } from '@/features/admin/organization/detail/runtime';
import { useOrganizationForm } from '@/features/components/organization/organizationForm/useOrganizationForm';
import {
  toUpdateOrganizationRequest,
  valuesFromOrganization,
} from '@/models/organization';
import { handleAdminFailure } from '../adminFailureFeedback';
import { createOrganizationDetailPageCommands } from './organizationDetailPage.commands';

function createOrganizationDetailPageContext() {
  const { actions, store } = createOrganizationDetailRuntime();
  const commands = createOrganizationDetailPageCommands(actions);

  return { commands, store };
}

export function useOrganizationDetailPageVM(organizationId: string) {
  const [{ commands, store }] = useState(createOrganizationDetailPageContext);
  const form = useOrganizationForm();
  const feedbackVM = useFeedbackVM();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const organization = useStore(store, (state) => state.organization);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);
  const stores = useStore(store, (state) => state.stores);
  const storesLoading = useStore(store, (state) => state.storesLoading);
  const owner = useStore(store, (state) => state.owner);
  const ownerLoading = useStore(store, (state) => state.ownerLoading);

  const formattedAddress = organization?.address
    ? [
        organization.address.tw.postalCode,
        organization.address.tw.city,
        organization.address.tw.district,
        organization.address.tw.streetAddress,
      ]
        .filter(Boolean)
        .join(' ')
    : '';
  const displayContactPhone = organization?.contactPhone?.nationalNumber ?? '';

  const loadOrganization = useCallback(async () => {
    await commands.loadOrganization(organizationId);
  }, [commands, organizationId]);

  useEffect(() => {
    void loadOrganization();
    void commands.loadStores(organizationId);
    void commands.loadOwner(organizationId);
  }, [commands, loadOrganization, organizationId]);

  const retry = useCallback(() => {
    void loadOrganization();
  }, [loadOrganization]);

  const openEditModal = useCallback(() => {
    if (!organization) return;
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
    form.resetErrors();

    const result = await commands.saveOrganizationDetail(
      organizationId,
      toUpdateOrganizationRequest(form.values),
    );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      discardAndCloseEditModal();
      return;
    }

    handleAdminFailure(result, {
      form: { setSubmitError: form.setSubmitError, setFieldErrors: form.setFieldErrors },
    });
  }, [discardAndCloseEditModal, commands, form, organizationId]);

  const reviewOrganization = useCallback(
    async (reviewStatus: 'approved' | 'rejected') => {
      const isApprove = reviewStatus === 'approved';
      const name = organization?.name ?? '';
      const confirmed = await feedbackVM.confirm({
        title: isApprove
          ? tDefault(
              'admin.organizations.approveConfirmTitle',
              'Approve organization?',
            )
          : tDefault(
              'admin.organizations.rejectConfirmTitle',
              'Reject organization?',
            ),
        message: isApprove
          ? tDefault(
              'admin.organizations.approveConfirmMessage',
              'This will mark "{{name}}" as approved.',
              { name },
            )
          : tDefault(
              'admin.organizations.rejectConfirmMessage',
              'This will mark "{{name}}" as rejected.',
              { name },
            ),
      });

      if (!confirmed) return;

      await commands.reviewOrganization(organizationId, reviewStatus);
    },
    [commands, feedbackVM, organization, organizationId],
  );

  return {
    closeEditModal,
    displayContactPhone,
    error,
    form,
    formattedAddress,
    isEditModalOpen,
    isLoading,
    loadOrganization,
    openEditModal,
    organization,
    owner,
    ownerLoading,
    retry,
    reviewOrganization,
    stores,
    storesLoading,
    submitOrganization,
  };
}
