import type {
  Organization,
  OrganizationFormValues,
  OrganizationListItem,
} from './types';

export function valuesFromOrganization(
  organization: OrganizationListItem | Organization,
): OrganizationFormValues {
  return {
    name: organization.name,
    ownerUserId: '',
    status: organization.status,
    slug: organization.slug || '',
    contactEmail:
      'contactEmail' in organization ? organization.contactEmail || '' : '',
    contactPhone:
      'contactPhone' in organization
        ? organization.contactPhone?.nationalNumber || ''
        : '',
    address: {
      city: ('address' in organization && organization.address?.tw.city) || '',
      district:
        ('address' in organization && organization.address?.tw.district) || '',
      postalCode:
        ('address' in organization && organization.address?.tw.postalCode) ||
        '',
      streetAddress:
        ('address' in organization && organization.address?.tw.streetAddress) ||
        '',
    },
  };
}
