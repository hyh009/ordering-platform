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
    form.setSubmitError(null);

    const result = await commands.saveOrganizationDetail(
      organizationId,
      toUpdateOrganizationRequest(form.values),
    );

    form.setIsSubmitting(false);

    if (result.status === 'saved') {
      discardAndCloseEditModal();
      await loadOrganization();
      return;
    }

    form.setFieldErrors(result.fieldErrors ?? {});
    form.setSubmitError(result.message);
  }, [discardAndCloseEditModal, commands, form, organizationId, loadOrganization]);

  const reviewOrganization = useCallback(
    async (reviewStatus: 'approved' | 'rejected') => {
      const isApprove = reviewStatus === 'approved';
      const confirmed = await feedbackVM.confirm({
        title: tDefault(
          isApprove
            ? 'admin.organizations.approveConfirmTitle'
            : 'admin.organizations.rejectConfirmTitle',
          isApprove ? 'Approve organization?' : 'Reject organization?',
        ),
        message: tDefault(
          isApprove
            ? 'admin.organizations.approveConfirmMessage'
            : 'admin.organizations.rejectConfirmMessage',
          isApprove
            ? 'This will mark "{{name}}" as approved.'
            : 'This will mark "{{name}}" as rejected.',
          { name: organization?.name ?? '' },
        ),
      });

      if (!confirmed) return;

      // The command updates the detail store on success, so the badge and the
      // pending-action buttons refresh without an extra reload.
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
    reviewOrganization,
    stores,
    storesLoading,
    submitOrganization,
  };
}
