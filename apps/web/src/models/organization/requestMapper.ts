import type {
  CreateOrganizationRequest,
  OrganizationAddressDto,
  OrganizationFormValues,
  OrganizationPhoneDto,
  UpdateOrganizationRequest,
} from './types';

function toAddressRequest(
  values: OrganizationFormValues,
): OrganizationAddressDto | undefined {
  const postalCode = values.address.postalCode.trim();
  const city = values.address.city.trim();
  const district = values.address.district.trim();
  const streetAddress = values.address.streetAddress.trim();

  if (!postalCode && !city && !district && !streetAddress) {
    return undefined;
  }

  return {
    countryCode: 'TW',
    schemaVersion: 1,
    formatted: [postalCode, city, district, streetAddress]
      .filter(Boolean)
      .join(''),
    tw: {
      ...(postalCode ? { postalCode } : {}),
      city,
      district,
      streetAddress,
    },
  };
}

function toAddressUpdateRequest(values: OrganizationFormValues) {
  return toAddressRequest(values) ?? null;
}

function toTaiwanPhoneRequest(value: string): OrganizationPhoneDto | undefined {
  const nationalNumber = value.replace(/[^\d]/g, '');

  if (!nationalNumber) {
    return undefined;
  }

  let type: OrganizationPhoneDto['type'] = 'landline';
  if (nationalNumber.startsWith('09')) {
    type = 'mobile';
  } else if (nationalNumber.startsWith('0800')) {
    type = 'toll_free';
  }

  return {
    countryCode: 'TW',
    e164: `+886${nationalNumber.slice(1)}`,
    nationalNumber,
    type,
  };
}

export function toCreateOrganizationRequest(
  values: OrganizationFormValues,
): CreateOrganizationRequest {
  return {
    name: values.name.trim(),
    ownerUserId: values.ownerUserId.trim(),
    domain: values.domain.trim() || undefined,
    contactEmail: values.contactEmail.trim() || undefined,
    contactPhone: toTaiwanPhoneRequest(values.contactPhone),
    address: toAddressRequest(values),
  };
}

export function toUpdateOrganizationRequest(
  values: OrganizationFormValues,
): UpdateOrganizationRequest {
  return {
    name: values.name.trim(),
    status: values.status,
    domain: values.domain.trim() || undefined,
    contactEmail: values.contactEmail.trim() || null,
    contactPhone: toTaiwanPhoneRequest(values.contactPhone) ?? null,
    address: toAddressUpdateRequest(values),
  };
}
