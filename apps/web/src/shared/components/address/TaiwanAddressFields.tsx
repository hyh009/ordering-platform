import { type ReactNode, useMemo } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { Field } from '@/shared/components/form/Field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import {
  getTaiwanCityOptions,
  getTaiwanDistrictOptions,
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

const cityOptions = getTaiwanCityOptions();

export function TaiwanAddressFields({
  errors = {},
  value,
  onChange,
}: TaiwanAddressFieldsProps) {
  const { tDefault } = useAppTranslation();
  const districtOptions = useMemo(
    () => getTaiwanDistrictOptions(value.city),
    [value.city],
  );

  function updateValue(nextValue: Partial<TaiwanAddressValue>) {
    onChange({
      ...value,
      ...nextValue,
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          error={errors.city}
          label={tDefault('common.address.city', 'City')}
        >
          <Select
            value={value.city}
            placeholder={tDefault('common.address.selectCity', 'Select city')}
            options={cityOptions.map((city) => ({
              label: city,
              value: city,
            }))}
            onValueChange={(nextCity) => {
              updateValue({
                city: nextCity,
                district: '',
                postalCode: '',
              });
            }}
          />
        </Field>

        <Field
          error={errors.district}
          label={tDefault('common.address.district', 'District')}
        >
          <Select
            disabled={!value.city}
            value={value.district}
            placeholder={tDefault(
              'common.address.selectDistrict',
              'Select district',
            )}
            options={districtOptions.map((option) => ({
              label: option.district,
              value: option.district,
            }))}
            onValueChange={(district) => {
              const selectedDistrict = districtOptions.find(
                (option) => option.district === district,
              );

              updateValue({
                district,
                postalCode: selectedDistrict?.postalCode ?? '',
              });
            }}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field
          error={errors.postalCode}
          label={tDefault('common.address.postalCode', 'Postal code')}
        >
          <Input readOnly value={value.postalCode} />
        </Field>

        <Field
          error={errors.streetAddress}
          label={tDefault('common.address.streetAddress', 'Street address')}
        >
          <Input
            value={value.streetAddress}
            onChange={(event) => {
              updateValue({ streetAddress: event.target.value });
            }}
          />
        </Field>
      </div>
    </div>
  );
}
