import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import {
  createOrganizationMembershipSchema,
  updateOrganizationMembershipSchema,
} from '@repo/shared';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { tDefault } from '@/app/i18n';
import { useAddMemberForm } from '@/features/organization/membership/components/addMemberForm/useAddMemberForm';
import { createOrganizationMembershipListRuntime } from '@/features/organization/membership/runtime';
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
  const [{ commands, store }] = useState(createOrganizationMembershipsPageContext);
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

  const { hasNextPage, hasPreviousPage, nextPage, page, previousPage, totalPages } =
    useOffsetPaginationControls({ loadPage, pagination });

  useEffect(() => {
    void loadPage({ limit: pagination.limit, offset: 0 });
  }, [loadPage, pagination.limit]);

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
    const request = toCreateOrganizationMembershipRequest(addForm.values);
    const validation = createOrganizationMembershipSchema.safeParse(request);

    if (!validation.success) {
      const raw = validation.error.flatten().fieldErrors;
      addForm.setFieldErrors({
        email: raw.email?.length
          ? tDefault('admin.memberships.errors.email', 'Enter a valid email address.')
          : undefined,
        username: raw.username?.length
          ? tDefault('admin.memberships.errors.username', 'Username is required.')
          : undefined,
        temporaryPassword: raw.temporaryPassword?.length
          ? tDefault(
              'admin.memberships.errors.temporaryPassword',
              'Password must be at least 8 characters.',
            )
          : undefined,
        role: raw.role?.length
          ? tDefault('admin.memberships.errors.role', 'Select a role.')
          : undefined,
      });
      addForm.setSubmitError(
        tDefault('admin.errors.validation', 'Check the highlighted fields and try again.'),
      );
      return;
    }

    addForm.setIsSubmitting(true);
    addForm.setSubmitError(null);

    const result = await commands.addMember(organizationId, validation.data);

    if (result.status === 'saved') {
      setIsAddModalOpen(false);
      void loadPage({ limit: pagination.limit, offset: pagination.offset });
      feedbackCommands.toast({
        message: tDefault('admin.memberships.addSuccess', 'Member added.'),
        tone: 'success',
      });
      return;
    }

    addForm.setIsSubmitting(false);
    addForm.setSubmitError(result.message);
  }, [commands, organizationId, addForm, loadPage, pagination]);

  // Edit membership modal
  const [editTarget, setEditTarget] = useState<OrganizationMembership | null>(null);
  const [editForm, setEditForm] = useState(initialEditForm);

  const openEditModal = useCallback((membership: OrganizationMembership) => {
    setEditTarget(membership);
    setEditForm({ isSubmitting: false, submitError: null, role: membership.role });
  }, []);

  const closeEditModal = useCallback(() => {
    setEditTarget(null);
  }, []);

  const setEditRole = useCallback((role: OrganizationMembershipRole) => {
    setEditForm((prev) => ({ ...prev, role }));
  }, []);

  const submitEdit = useCallback(async () => {
    if (!editTarget) return;

    const request = toUpdateOrganizationMembershipRoleRequest({ role: editForm.role });
    const validation = updateOrganizationMembershipSchema.safeParse(request);

    if (!validation.success) {
      setEditForm((prev) => ({
        ...prev,
        submitError: tDefault('admin.errors.validation', 'Check the highlighted fields and try again.'),
      }));
      return;
    }

    setEditForm((prev) => ({ ...prev, isSubmitting: true, submitError: null }));

    const result = await commands.updateMembership(
      organizationId,
      editTarget.id,
      validation.data,
    );

    if (result.status === 'saved') {
      setEditTarget(null);
      feedbackCommands.toast({
        message: tDefault('admin.memberships.updateSuccess', 'Membership updated.'),
        tone: 'success',
      });
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      isSubmitting: false,
      submitError: result.message,
    }));
  }, [commands, editTarget, editForm.role, organizationId]);

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
    );

    if (result.status === 'saved') {
      setEditTarget(null);
      feedbackCommands.toast({
        message: tDefault('admin.memberships.disableSuccess', 'Membership disabled.'),
        tone: 'success',
      });
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      isSubmitting: false,
      submitError: result.message,
    }));
  }, [commands, editTarget, organizationId, feedbackVM]);

  return {
    addForm,
    closeAddModal,
    closeEditModal,
    editForm,
    editTarget,
    error,
    hasNextPage,
    hasPreviousPage,
    isAddModalOpen,
    isLoading,
    loadPage,
    memberships,
    nextPage,
    openAddModal,
    openEditModal,
    page,
    pagination,
    previousPage,
    setEditRole,
    submitAdd,
    submitDisable,
    submitEdit,
    totalPages,
  };
}
