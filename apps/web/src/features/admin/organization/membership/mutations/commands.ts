import { tDefault } from '@/app/i18n';
import { mapAddMemberValidationIssuesToFieldErrors } from '@/features/admin/organization/membership/components/addMemberForm/addMemberFormErrors';
import {
  createOrganizationMembershipSchema,
  updateOrganizationMembershipSchema,
} from '@/models/organizationMembership';
import type {
  CreateOrganizationMembershipRequest,
  OrganizationMembership,
  UpdateOrganizationMembershipRequest,
} from '@/models/organizationMembership';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';

export type AddMemberCommandFieldErrors = ReturnType<
  typeof mapAddMemberValidationIssuesToFieldErrors
>;

export type SaveMembershipResult =
  | { status: 'saved'; membership: OrganizationMembership }
  | (AdminCommandFailure & {
      fieldErrors?: AddMemberCommandFieldErrors;
    });

function invalidMembershipResult(fieldErrors?: AddMemberCommandFieldErrors) {
  return {
    ...(fieldErrors ? { fieldErrors } : {}),
    message: tDefault(
      'admin.errors.validation',
      'Check the highlighted fields and try again.',
    ),
    reason: 'invalid',
    status: 'failed',
  } satisfies SaveMembershipResult;
}

export const organizationMembershipMutationCommands = {
  async addMember(
    organizationId: string,
    input: CreateOrganizationMembershipRequest,
  ): Promise<SaveMembershipResult> {
    const validation = createOrganizationMembershipSchema.safeParse(input);

    if (!validation.success) {
      return invalidMembershipResult(
        mapAddMemberValidationIssuesToFieldErrors(validation.error.issues),
      );
    }

    try {
      const membership = await organizationService.addOrganizationMember(
        organizationId,
        validation.data,
      );

      return { status: 'saved', membership };
    } catch (error) {
      return mapAdminApiError(error);
    }
  },

  async updateMembership(
    organizationId: string,
    membershipId: string,
    input: UpdateOrganizationMembershipRequest,
  ): Promise<SaveMembershipResult> {
    const validation = updateOrganizationMembershipSchema.safeParse(input);

    if (!validation.success) {
      return invalidMembershipResult();
    }

    try {
      const membership =
        await organizationService.updateOrganizationMembership(
          organizationId,
          membershipId,
          validation.data,
        );

      return { status: 'saved', membership };
    } catch (error) {
      return mapAdminApiError(error);
    }
  },
};
