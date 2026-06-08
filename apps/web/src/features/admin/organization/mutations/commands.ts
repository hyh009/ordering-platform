import { tDefault } from '@/app/i18n';
import {
  mapOrganizationValidationIssuesToFieldErrors,
  type OrganizationFormFieldErrors,
} from '@/features/components/organization/organizationForm/organizationFormErrors';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from '@/models/organization';
import type {
  CreateOrganizationRequest,
  Organization,
  OrganizationReviewStatus,
  UpdateOrganizationRequest,
} from '@/models/organization';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';

export type OrganizationMutationFieldErrors = OrganizationFormFieldErrors;

export type SaveOrganizationResult =
  | {
      organization: Organization;
      status: 'saved';
    }
  | (AdminCommandFailure & {
      fieldErrors?: OrganizationMutationFieldErrors;
    });

function invalidOrganizationResult(fieldErrors: OrganizationMutationFieldErrors) {
  return {
    fieldErrors,
    message: tDefault(
      'admin.errors.validation',
      'Check the highlighted fields and try again.',
    ),
    reason: 'invalid',
    status: 'failed',
  } satisfies SaveOrganizationResult;
}

async function createOrganizationMutation(
  input: CreateOrganizationRequest,
): Promise<SaveOrganizationResult> {
  const validation = createOrganizationSchema.safeParse(input);

  if (!validation.success) {
    return invalidOrganizationResult(
      mapOrganizationValidationIssuesToFieldErrors(validation.error.issues),
    );
  }

  try {
    const organization = await organizationService.createOrganization(
      validation.data,
    );

    return {
      organization,
      status: 'saved',
    };
  } catch (error) {
    return mapAdminApiError(error);
  }
}

async function updateOrganizationMutation(
  organizationId: string,
  input: UpdateOrganizationRequest,
): Promise<SaveOrganizationResult> {
  const validation = updateOrganizationSchema.safeParse(input);

  if (!validation.success) {
    return invalidOrganizationResult(
      mapOrganizationValidationIssuesToFieldErrors(validation.error.issues),
    );
  }

  try {
    const organization = await organizationService.updateOrganization(
      organizationId,
      validation.data,
    );

    return {
      organization,
      status: 'saved',
    };
  } catch (error) {
    return mapAdminApiError(error);
  }
}

export const organizationMutationCommands = {
  createOrganization: createOrganizationMutation,
  updateOrganization: updateOrganizationMutation,
  async reviewOrganization(
    organizationId: string,
    reviewStatus: OrganizationReviewStatus,
  ): Promise<SaveOrganizationResult> {
    return updateOrganizationMutation(organizationId, { reviewStatus });
  },
};
