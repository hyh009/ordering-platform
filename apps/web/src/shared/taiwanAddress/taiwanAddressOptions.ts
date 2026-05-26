import { getCityArray, getDistrictArray } from '@simoko/tw-zip';

export type TaiwanDistrictOption = {
  district: string;
  postalCode: string;
};

export function getTaiwanCityOptions() {
  return getCityArray();
}

export function getTaiwanDistrictOptions(
  city: string,
): TaiwanDistrictOption[] {
  if (!city) {
    return [];
  }

  return getDistrictArray(city).map((option) => ({
    district: option.label ?? '',
    postalCode: option.value ?? '',
  }));
}
