import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { useFeedbackVM } from '@/app/global/feedback/useFeedbackVM';
import { tDefault } from '@/app/i18n';
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

const initialAddForm = {
  fieldErrors: {} as Record<string, string | undefined>,
  isSubmitting: false,
  submitError: null as string | null,
  userId: '',
  role: 'staff' as OrganizationMembershipRole,
};

const initialEditForm = {
  isSubmitting: false,
  submitError: null as string | null,
  role: 'staff' as OrganizationMembershipRole,
};

export function useOrganizationMembershipsPageVM(organizationId: string) {
  const [{ commands, store }] = useState(createOrganizationMembershipsPageContext);
  const feedbackVM = useFeedbackVM();

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
  const [addForm, setAddForm] = useState(initialAddForm);

  const openAddModal = useCallback(() => {
    setAddForm(initialAddForm);
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const setAddField = useCallback(
    <K extends 'userId' | 'role'>(field: K, value: (typeof initialAddForm)[K]) => {
      setAddForm((prev) => ({
        ...prev,
        [field]: value,
        fieldErrors: { ...prev.fieldErrors, [field]: undefined },
      }));
    },
    [],
  );

  const submitAdd = useCallback(async () => {
    setAddForm((prev) => ({ ...prev, isSubmitting: true, submitError: null }));

    const result = await commands.addMember(
      organizationId,
      toCreateOrganizationMembershipRequest({ userId: addForm.userId, role: addForm.role }),
    );

    if (result.status === 'saved') {
      setIsAddModalOpen(false);
      feedbackCommands.toast({
        message: tDefault('admin.memberships.addSuccess', 'Member added.'),
        tone: 'success',
      });
      return;
    }

    setAddForm((prev) => ({
      ...prev,
      isSubmitting: false,
      submitError: result.message,
    }));
  }, [commands, organizationId, addForm.userId, addForm.role, feedbackVM]);

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

    setEditForm((prev) => ({ ...prev, isSubmitting: true, submitError: null }));

    const result = await commands.updateMembership(
      organizationId,
      editTarget.id,
      toUpdateOrganizationMembershipRoleRequest({ role: editForm.role }),
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
  }, [commands, editTarget, editForm.role, organizationId, feedbackVM]);

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

    setEditForm((prev) => ({ ...prev, isSubmitting: true, submitError: null }));

    const result = await commands.updateMembership(
      organizationId,
      editTarget.id,
      toDisableOrganizationMembershipRequest(),
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
    setAddField,
    setEditRole,
    submitAdd,
    submitDisable,
    submitEdit,
    totalPages,
  };
}
