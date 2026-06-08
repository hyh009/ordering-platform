import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { tDefault } from '@/app/i18n';
import { useAddMemberForm } from '@/features/admin/organization/membership/components/addMemberForm/useAddMemberForm';
import { createOrganizationMembershipListRuntime } from '@/features/admin/organization/membership/list/runtime';
import type { OrganizationMembership } from '@/models/organizationMembership';
import {
  toCreateOrganizationMembershipRequest,
  toDisableOrganizationMembershipRequest,
  toUpdateOrganizationMembershipRoleRequest,
} from '@/models/organizationMembership';
import type { OrganizationMembershipRole } from '@/models/organizationMembership';
import {
  useOffsetPaginationControls,
  type OffsetPaginationLoadPageInput,
} from '@/shared/hooks/useOffsetPaginationControls';
import { createOrganizationMembershipsPageCommands } from './organizationMembershipsPage.commands';

function createOrganizationMembershipsPageContext() {
  const { actions, store } = createOrganizationMembershipListRuntime();
  const commands = createOrganizationMembershipsPageCommands(actions);

  return { commands, store };
}

const initialEditForm = {
  isSubmitting: false,
  submitError: null as string | null,
  role: 'staff' as OrganizationMembershipRole,
};

export function useOrganizationMembershipsPageVM(organizationId: string) {
  const [{ commands, store }] = useState(
    createOrganizationMembershipsPageContext,
  );
  const feedbackVM = useFeedbackVM();
  const addForm = useAddMemberForm();

  const memberships = useStore(store, (state) => state.memberships);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);
  const pagination = useStore(store, (state) => state.pagination);

  const loadPage = useCallback(
    async function loadPage({ limit, offset }: OffsetPaginationLoadPageInput) {
      await commands.loadMemberships(organizationId, { limit, offset });
    },
    [commands, organizationId],
  );

  const { changeLimit, goToPage, page, totalPages } =
    useOffsetPaginationControls({
      loadPage,
      pagination,
    });

  // Initial load only. Page-size and page-number changes go through
  // changeLimit / goToPage, so pagination.limit is intentionally not a dep
  // (depending on it would re-fire and double-fetch after changeLimit).
  useEffect(() => {
    void loadPage({ limit: pagination.limit, offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPage]);

  // Add member modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const openAddModal = useCallback(() => {
    addForm.reset();
    setIsAddModalOpen(true);
  }, [addForm]);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const submitAdd = useCallback(async () => {
    addForm.setIsSubmitting(true);
    addForm.setSubmitError(null);

    const result = await commands.addMember(
      organizationId,
      toCreateOrganizationMembershipRequest(addForm.values),
      { limit: pagination.limit, offset: pagination.offset },
    );

    if (result.status === 'saved') {
      setIsAddModalOpen(false);
      feedbackCommands.toast({
        message: tDefault('admin.memberships.addSuccess', 'Member added.'),
        tone: 'success',
      });
      return;
    }

    addForm.setIsSubmitting(false);
    addForm.setFieldErrors(result.fieldErrors ?? {});
    addForm.setSubmitError(result.message);
  }, [commands, organizationId, addForm, pagination]);

  // Edit membership modal
  const [editTarget, setEditTarget] = useState<OrganizationMembership | null>(
    null,
  );
  const [editForm, setEditForm] = useState(initialEditForm);

  const openEditModal = useCallback((membership: OrganizationMembership) => {
    setEditTarget(membership);
    setEditForm({
      isSubmitting: false,
      submitError: null,
      role: membership.role,
    });
  }, []);

  const closeEditModal = useCallback(() => {
    setEditTarget(null);
  }, []);

  const setEditRole = useCallback((role: OrganizationMembershipRole) => {
    setEditForm((prev) => ({ ...prev, role }));
  }, []);

  const submitEdit = useCallback(async () => {
    if (!editTarget) return;

    const request = toUpdateOrganizationMembershipRoleRequest({
      role: editForm.role,
    });

    setEditForm((prev) => ({ ...prev, isSubmitting: true, submitError: null }));

    const result = await commands.updateMembership(
      organizationId,
      editTarget.id,
      request,
      { limit: pagination.limit, offset: pagination.offset },
    );

    if (result.status === 'saved') {
      setEditTarget(null);
      feedbackCommands.toast({
        message: tDefault(
          'admin.memberships.updateSuccess',
          'Membership updated.',
        ),
        tone: 'success',
      });
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      isSubmitting: false,
      submitError: result.message,
    }));
  }, [commands, editTarget, editForm.role, organizationId, pagination]);

  const submitDisable = useCallback(async () => {
    if (!editTarget) return;

    const confirmed = await feedbackVM.confirm({
      title: tDefault('admin.memberships.disableTitle', 'Disable member?'),
      message: tDefault(
        'admin.memberships.disableMessage',
        'This will disable the membership. The user will lose access to this organization.',
      ),
    });

    if (!confirmed) return;

    const disableRequest = toDisableOrganizationMembershipRequest();

    setEditForm((prev) => ({ ...prev, isSubmitting: true, submitError: null }));

    const result = await commands.updateMembership(
      organizationId,
      editTarget.id,
      disableRequest,
      { limit: pagination.limit, offset: pagination.offset },
    );

    if (result.status === 'saved') {
      setEditTarget(null);
      feedbackCommands.toast({
        message: tDefault(
          'admin.memberships.disableSuccess',
          'Membership disabled.',
        ),
        tone: 'success',
      });
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      isSubmitting: false,
      submitError: result.message,
    }));
  }, [commands, editTarget, organizationId, feedbackVM, pagination]);

  return {
    addForm,
    changeLimit,
    closeAddModal,
    closeEditModal,
    editForm,
    editTarget,
    error,
    goToPage,
    isAddModalOpen,
    isLoading,
    loadPage,
    memberships,
    openAddModal,
    openEditModal,
    page,
    pagination,
    setEditRole,
    submitAdd,
    submitDisable,
    submitEdit,
    totalPages,
  };
}
