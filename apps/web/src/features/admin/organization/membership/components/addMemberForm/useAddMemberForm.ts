import type { OrganizationMembershipAddFormValues } from '@/models/organizationMembership';
import { useFormState } from '@/shared/hooks/useFormState';

const initialValues: OrganizationMembershipAddFormValues = {
  email: '',
  username: '',
  temporaryPassword: '',
  role: 'staff',
};

export function useAddMemberForm() {
  return useFormState(initialValues);
}

export type AddMemberFormVM = ReturnType<typeof useAddMemberForm>;
