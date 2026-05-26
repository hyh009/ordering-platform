import enCounties from 'twzipcode-data/dist/en/counties';
import enZipcodes from 'twzipcode-data/dist/en/zipcodes';
import zhTwCounties from 'twzipcode-data/dist/zh-tw/counties';
import zhTwZipcodes from 'twzipcode-data/dist/zh-tw/zipcodes';

export type TaiwanAddressLocale = 'en' | 'zh-TW';

type TwZipcodeRecord = {
  city: string;
  county: string;
  id: string;
  zipcode: number;
};

type TwZipcodeData = {
  counties: Array<{
    id: string;
    name: string;
  }>;
  zipcodes: TwZipcodeRecord[];
};

export type TaiwanCityOption = {
  city: string;
  label: string;
};

export type TaiwanDistrictOption = {
  district: string;
  label: string;
  postalCode: string;
};

export type TaiwanPostalCodeOption = TaiwanDistrictOption & {
  city: string;
  cityLabel: string;
};

export function getCanonicalTaiwanAddressName(value: string) {
  return value.replaceAll('台', '臺');
}

function getTaiwanAddressData(locale: TaiwanAddressLocale) {
  if (locale === 'zh-TW') {
    return {
      counties: zhTwCounties,
      zipcodes: zhTwZipcodes,
    } satisfies TwZipcodeData;
  }

  return {
    counties: enCounties,
    zipcodes: enZipcodes,
  } satisfies TwZipcodeData;
}

function getCanonicalTaiwanAddressData() {
  return getTaiwanAddressData('zh-TW');
}

function getCanonicalZipcodeMap() {
  return new Map(
    getCanonicalTaiwanAddressData().zipcodes.map((option) => [
      option.id,
      option,
    ]),
  );
}

function toPostalCode(postalCode: number) {
  return String(postalCode).padStart(3, '0');
}

export function getTaiwanCityOptions(
  locale: TaiwanAddressLocale,
): TaiwanCityOption[] {
  return getTaiwanAddressData(locale).counties.map((county) => ({
    city: county.id,
    label: county.name,
  }));
}

export function getTaiwanDistrictOptions(
  city: string,
  locale: TaiwanAddressLocale,
): TaiwanDistrictOption[] {
  if (!city) {
    return [];
  }

  const canonicalCity = getCanonicalTaiwanAddressName(city);
  const localizedZipcodes = getTaiwanAddressData(locale).zipcodes;
  const canonicalZipcodeMap = getCanonicalZipcodeMap();

  return localizedZipcodes
    .filter(
      (option) => canonicalZipcodeMap.get(option.id)?.county === canonicalCity,
    )
    .map((option) => {
      const canonicalOption = canonicalZipcodeMap.get(option.id);

      return {
        district: canonicalOption?.city ?? option.city,
        label: option.city,
        postalCode: toPostalCode(option.zipcode),
      };
    });
}

export function getTaiwanPostalCodeOptions(
  locale: TaiwanAddressLocale,
): TaiwanPostalCodeOption[] {
  const localizedZipcodes = getTaiwanAddressData(locale).zipcodes;
  const canonicalZipcodeMap = getCanonicalZipcodeMap();

  return localizedZipcodes.map((option) => {
    const canonicalOption = canonicalZipcodeMap.get(option.id);

    return {
      city: canonicalOption?.county ?? option.county,
      cityLabel: option.county,
      district: canonicalOption?.city ?? option.city,
      label: option.city,
      postalCode: toPostalCode(option.zipcode),
    };
  });
}
