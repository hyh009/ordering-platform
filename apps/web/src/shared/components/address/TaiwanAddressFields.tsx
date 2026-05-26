import { type ReactNode, useId, useMemo, useState } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { Field } from '@/shared/components/form/Field';
import { OptionsSelect } from '@/shared/components/form/OptionsSelect';
import { SearchableSelect } from '@/shared/components/form/SearchableSelect';
import { Input } from '@/shared/components/ui/input';
import {
  getCanonicalTaiwanAddressName,
  getTaiwanCityOptions,
  getTaiwanDistrictOptions,
  getTaiwanPostalCodeOptions,
  type TaiwanAddressLocale,
} from '@/shared/taiwanAddress/taiwanAddressOptions';

export type TaiwanAddressValue = {
  postalCode: string;
  city: string;
  district: string;
  streetAddress: string;
};

export type TaiwanAddressFieldErrors = Partial<
  Record<keyof TaiwanAddressValue, ReactNode>
>;

type TaiwanAddressFieldsProps = {
  errors?: TaiwanAddressFieldErrors;
  value: TaiwanAddressValue;
  onChange: (value: TaiwanAddressValue) => void;
};

const addressErrorOrder: Array<keyof TaiwanAddressValue> = [
  'postalCode',
  'city',
  'district',
  'streetAddress',
];

function getPostalCodeOptionValue(option: {
  city: string;
  district: string;
  postalCode: string;
}) {
  return `${option.postalCode}:${option.city}:${option.district}`;
}

function getPostalCodeOptionLabel(option: {
  city: string;
  cityLabel: string;
  district: string;
  label: string;
  postalCode: string;
}) {
  return `${option.postalCode} ${option.cityLabel} ${option.label}`;
}

function getAddressValueLabel(value: TaiwanAddressValue) {
  return [value.postalCode, value.city, value.district]
    .filter(Boolean)
    .join(' ');
}

export function TaiwanAddressFields({
  errors = {},
  value,
  onChange,
}: TaiwanAddressFieldsProps) {
  const { language, tDefault } = useAppTranslation();
  const addressLocale: TaiwanAddressLocale =
    language === 'zh-TW' ? 'zh-TW' : 'en';
  const cityOptions = useMemo(
    () => getTaiwanCityOptions(addressLocale),
    [addressLocale],
  );
  const postalCodeOptions = useMemo(
    () => getTaiwanPostalCodeOptions(addressLocale),
    [addressLocale],
  );
  const addressErrorBaseId = useId();
  const addressErrorIds: Record<keyof TaiwanAddressValue, string> = {
    postalCode: `${addressErrorBaseId}-postal-code-error`,
    city: `${addressErrorBaseId}-city-error`,
    district: `${addressErrorBaseId}-district-error`,
    streetAddress: `${addressErrorBaseId}-street-address-error`,
  };
  const selectedPostalCodeOption = postalCodeOptions.find(
    (option) =>
      option.postalCode === value.postalCode &&
      option.city === getCanonicalTaiwanAddressName(value.city) &&
      option.district === getCanonicalTaiwanAddressName(value.district),
  );
  const fallbackPostalCodeOptionLabel = getAddressValueLabel(value);
  const hasSelectedAddressValue = Boolean(fallbackPostalCodeOptionLabel);
  const selectedPostalCodeOptionValue = selectedPostalCodeOption
    ? getPostalCodeOptionValue(selectedPostalCodeOption)
    : hasSelectedAddressValue
      ? getPostalCodeOptionValue(value)
      : '';
  const selectedPostalCodeOptionLabel = selectedPostalCodeOption
    ? getPostalCodeOptionLabel(selectedPostalCodeOption)
    : fallbackPostalCodeOptionLabel;
  const [postalCodeSearch, setPostalCodeSearch] = useState('');
  const districtOptions = useMemo(
    () => getTaiwanDistrictOptions(value.city, addressLocale),
    [addressLocale, value.city],
  );
  const addressError = addressErrorOrder
    .map((field) => ({
      error: errors[field],
      field,
    }))
    .filter(
      (entry): entry is { error: ReactNode; field: keyof TaiwanAddressValue } =>
        Boolean(entry.error),
    );
  const postalCodeSelectOptions = useMemo(
    () =>
      postalCodeOptions.map((option) => ({
        label: getPostalCodeOptionLabel(option),
        searchLabel: getPostalCodeOptionLabel(option),
        value: getPostalCodeOptionValue(option),
      })),
    [postalCodeOptions],
  );
  const filteredPostalCodeSelectOptions = useMemo(() => {
    const keyword = postalCodeSearch.trim().toLowerCase();

    if (!keyword) {
      return postalCodeSelectOptions;
    }

    return postalCodeSelectOptions.filter((option) =>
      option.searchLabel.toLowerCase().includes(keyword),
    );
  }, [postalCodeSearch, postalCodeSelectOptions]);

  function updateValue(nextValue: Partial<TaiwanAddressValue>) {
    onChange({
      ...value,
      ...nextValue,
    });
  }

  function updateFromCity(city: string) {
    const nextDistrictOption = getTaiwanDistrictOptions(city, addressLocale)[0];
    const postalCode = nextDistrictOption?.postalCode ?? '';
    updateValue({
      city,
      district: nextDistrictOption?.district ?? '',
      postalCode,
    });
    setPostalCodeSearch('');
  }

  function updateFromDistrict(district: string) {
    const selectedDistrict = districtOptions.find(
      (option) => option.district === district,
    );
    const postalCode = selectedDistrict?.postalCode ?? '';

    updateValue({
      district,
      postalCode,
    });
    setPostalCodeSearch('');
  }

  function updateFromPostalCode(optionValue: string) {
    const selectedPostalCode = postalCodeOptions.find(
      (option) => getPostalCodeOptionValue(option) === optionValue,
    );
    const postalCode = selectedPostalCode?.postalCode ?? '';

    updateValue({
      postalCode,
      city: selectedPostalCode?.city ?? '',
      district: selectedPostalCode?.district ?? '',
    });
    setPostalCodeSearch('');
  }

  return (
    <div className="grid gap-4">
      <Field
        error={errors.postalCode}
        label={tDefault('common.address.postalCode', 'Postal code')}
        showErrorMessage={false}
      >
        <SearchableSelect
          aria-describedby={
            errors.postalCode ? addressErrorIds.postalCode : undefined
          }
          value={selectedPostalCodeOptionValue}
          searchValue={postalCodeSearch}
          placeholder={tDefault(
            'common.address.searchPostalCode',
            'Search postal code',
          )}
          emptyMessage={tDefault(
            'common.address.noPostalCodeResults',
            'No postal codes found.',
          )}
          options={filteredPostalCodeSelectOptions}
          selectedOption={
            hasSelectedAddressValue
              ? {
                  label: selectedPostalCodeOptionLabel,
                  searchLabel: selectedPostalCodeOptionLabel,
                  value: selectedPostalCodeOptionValue,
                }
              : null
          }
          onSearchChange={setPostalCodeSearch}
          onValueChange={updateFromPostalCode}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          error={errors.city}
          label={tDefault('common.address.city', 'City')}
          showErrorMessage={false}
        >
          <OptionsSelect
            aria-describedby={errors.city ? addressErrorIds.city : undefined}
            value={getCanonicalTaiwanAddressName(value.city)}
            placeholder={tDefault('common.address.selectCity', 'Select city')}
            options={cityOptions.map((option) => ({
              label: option.label,
              value: option.city,
            }))}
            onValueChange={updateFromCity}
          />
        </Field>

        <Field
          error={errors.district}
          label={tDefault('common.address.district', 'District')}
          showErrorMessage={false}
        >
          <OptionsSelect
            aria-describedby={
              errors.district ? addressErrorIds.district : undefined
            }
            disabled={!value.city}
            value={getCanonicalTaiwanAddressName(value.district)}
            placeholder={tDefault(
              'common.address.selectDistrict',
              'Select district',
            )}
            options={districtOptions.map((option) => ({
              label: option.label,
              value: option.district,
            }))}
            onValueChange={updateFromDistrict}
          />
        </Field>
      </div>

      <Field
        error={errors.streetAddress}
        label={tDefault('common.address.streetAddress', 'Street address')}
        showErrorMessage={false}
      >
        <Input
          aria-describedby={
            errors.streetAddress ? addressErrorIds.streetAddress : undefined
          }
          value={value.streetAddress}
          onChange={(event) => {
            updateValue({ streetAddress: event.target.value });
          }}
        />
      </Field>

      <div className="grid min-h-5 gap-1 text-sm font-medium text-destructive">
        {addressError.map(({ error, field }) => (
          <p id={addressErrorIds[field]} key={field}>
            {error}
          </p>
        ))}
      </div>
    </div>
  );
}
