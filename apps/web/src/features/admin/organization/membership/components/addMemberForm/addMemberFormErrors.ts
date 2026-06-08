import { createOrganizationMembershipSchema } from '@repo/shared';
import { tDefault } from '@/app/i18n';
import type { OrganizationMembershipAddFormValues } from '@/models/organizationMembership';
import { toCreateOrganizationMembershipRequest } from '@/models/organizationMembership';
import type { CreateOrganizationMembershipRequest } from '@/models/organizationMembership';

type AddMemberFormFieldErrors = Partial<
  Record<keyof OrganizationMembershipAddFormValues, string | undefined>
>;

type ValidateAddMemberFormResult =
  | { success: true; data: CreateOrganizationMembershipRequest }
  | {
      success: false;
      fieldErrors: AddMemberFormFieldErrors;
      submitError: string;
    };

export function validateAddMemberForm(
  values: OrganizationMembershipAddFormValues,
): ValidateAddMemberFormResult {
  const request = toCreateOrganizationMembershipRequest(values);
  const result = createOrganizationMembershipSchema.safeParse(request);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const raw = result.error.flatten().fieldErrors;
  return {
    success: false,
    fieldErrors: {
      email: raw.email?.length
        ? tDefault(
            'admin.memberships.errors.email',
            'Enter a valid email address.',
          )
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
    },
    submitError: tDefault(
      'admin.errors.validation',
      'Check the highlighted fields and try again.',
    ),
  };
}
