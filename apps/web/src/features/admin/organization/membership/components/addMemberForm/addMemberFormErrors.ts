import { tDefault } from '@/app/i18n';
import type { OrganizationMembershipAddFormValues } from '@/models/organizationMembership';

export type AddMemberFormFieldErrors = Partial<
  Record<keyof OrganizationMembershipAddFormValues, string | undefined>
>;

type ValidationIssue = {
  path: PropertyKey[];
};

export function mapAddMemberValidationIssuesToFieldErrors(
  issues: ValidationIssue[],
): AddMemberFormFieldErrors {
  const hasIssue = (field: keyof OrganizationMembershipAddFormValues) =>
    issues.some((issue) => issue.path[0] === field);

  return {
    email: hasIssue('email')
      ? tDefault(
          'admin.memberships.errors.email',
          'Enter a valid email address.',
        )
      : undefined,
    username: hasIssue('username')
      ? tDefault('admin.memberships.errors.username', 'Username is required.')
      : undefined,
    temporaryPassword: hasIssue('temporaryPassword')
      ? tDefault(
          'admin.memberships.errors.temporaryPassword',
          'Password must be at least 8 characters.',
        )
      : undefined,
    role: hasIssue('role')
      ? tDefault('admin.memberships.errors.role', 'Select a role.')
      : undefined,
  };
}
