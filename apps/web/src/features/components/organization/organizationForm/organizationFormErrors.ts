import { tDefault } from '@/app/i18n';
import type { OrganizationFormValues } from '@/models/organization';

export type OrganizationFormField = Exclude<
  keyof OrganizationFormValues,
  'address'
>;
export type OrganizationAddressFormField =
  keyof OrganizationFormValues['address'];
export type OrganizationFormFieldErrorKey =
  | OrganizationFormField
  | `address.${OrganizationAddressFormField}`;
export type OrganizationFormFieldErrors = Partial<
  Record<OrganizationFormFieldErrorKey, string>
>;

function organizationValidationErrors() {
  return {
    contactEmail: tDefault(
      'admin.organizations.validation.contactEmailInvalid',
      'Enter a valid email address.',
    ),
    contactPhone: tDefault(
      'admin.organizations.validation.contactPhoneInvalid',
      'Enter a valid Taiwan phone number.',
    ),
    slug: tDefault(
      'admin.organizations.validation.slugInvalid',
      'Enter a valid slug.',
    ),
    name: tDefault(
      'admin.organizations.validation.nameRequired',
      'Organization name is required.',
    ),
    ownerUserId: tDefault(
      'admin.organizations.validation.ownerRequired',
      'Owner user ID is required.',
    ),
    status: tDefault(
      'admin.organizations.validation.statusInvalid',
      'Select a valid status.',
    ),
    'address.city': tDefault(
      'admin.organizations.validation.cityInvalid',
      'Select a valid city.',
    ),
    'address.district': tDefault(
      'admin.organizations.validation.districtInvalid',
      'Select a valid district.',
    ),
    'address.postalCode': tDefault(
      'admin.organizations.validation.postalCodeInvalid',
      'Enter a valid postal code.',
    ),
    'address.streetAddress': tDefault(
      'admin.organizations.validation.streetAddressInvalid',
      'Enter a valid street address.',
    ),
  };
}

function getOrganizationFieldErrorKey(
  path: PropertyKey[],
): OrganizationFormFieldErrorKey | null {
  const [field, second, third] = path.map(String);

  if (field === 'address') {
    if (second === 'tw') {
      if (
        third === 'city' ||
        third === 'district' ||
        third === 'postalCode' ||
        third === 'streetAddress'
      ) {
        return `address.${third}`;
      }
    }

    return 'address.streetAddress';
  }

  if (field === 'contactPhone') {
    return 'contactPhone';
  }

  if (
    field === 'contactEmail' ||
    field === 'slug' ||
    field === 'name' ||
    field === 'ownerUserId' ||
    field === 'status'
  ) {
    return field;
  }

  return null;
}

export function mapOrganizationValidationIssuesToFieldErrors(
  issues: Array<{ path: PropertyKey[] }>,
): OrganizationFormFieldErrors {
  const messages = organizationValidationErrors();
  const fieldErrors: OrganizationFormFieldErrors = {};

  for (const issue of issues) {
    const field = getOrganizationFieldErrorKey(issue.path);

    if (!field || fieldErrors[field]) {
      continue;
    }

    fieldErrors[field] =
      messages[field] ??
      tDefault('admin.validation.invalidField', 'This field is invalid.');
  }

  return fieldErrors;
}
