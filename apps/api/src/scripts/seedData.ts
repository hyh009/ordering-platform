import { faker } from '@faker-js/faker';
import { allergenRepository } from '@src/repositories/allergen/repository';
import { dietaryMarkerRepository } from '@src/repositories/dietaryMarker/repository';
import { organizationRepository } from '@src/repositories/organization/repository';

import type { CreateAllergenInput } from '@src/repositories/allergen/repository';
import type { CreateDietaryMarkerInput } from '@src/repositories/dietaryMarker/repository';
import type { CreateOrganizationInput } from '@src/repositories/organization/repository';

const taiwanSeedAddresses = [
  {
    postalCode: '100',
    city: '台北市',
    district: '中正區',
    streetAddress: '忠孝西路一段1號',
  },
  {
    postalCode: '104',
    city: '台北市',
    district: '中山區',
    streetAddress: '南京東路二段88號',
  },
  {
    postalCode: '403',
    city: '台中市',
    district: '西區',
    streetAddress: '公益路161號',
  },
  {
    postalCode: '700',
    city: '台南市',
    district: '中西區',
    streetAddress: '民生路一段20號',
  },
  {
    postalCode: '802',
    city: '高雄市',
    district: '苓雅區',
    streetAddress: '四維三路2號',
  },
] as const;

function toSeedSlug(value: string, index: number) {
  const label = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return label || `organization-${index + 1}`;
}

function buildSeedPhone(
  index: number,
): CreateOrganizationInput['contactPhone'] {
  const lineNumber = String(12_345_678 + index)
    .slice(-8)
    .padStart(8, '0');
  const nationalNumber = `09${lineNumber}`;

  return {
    countryCode: 'TW',
    e164: `+8869${lineNumber}`,
    nationalNumber,
    type: 'mobile',
  };
}

function buildSeedAddress(index: number): CreateOrganizationInput['address'] {
  const address =
    taiwanSeedAddresses[index % taiwanSeedAddresses.length] ??
    taiwanSeedAddresses[0];
  const streetAddress = `${address.streetAddress}${Math.floor(index / taiwanSeedAddresses.length) + 1}樓`;

  return {
    countryCode: 'TW',
    schemaVersion: 1,
    formatted: `${address.postalCode}${address.city}${address.district}${streetAddress}`,
    tw: {
      postalCode: address.postalCode,
      city: address.city,
      district: address.district,
      streetAddress,
    },
  };
}

export async function seedAllergens() {
  const existingAllergens = await allergenRepository.list({
    isActive: undefined,
  });
  const existingKeys = new Set(existingAllergens.map((a) => a.key));

  const allergensToSeed: CreateAllergenInput[] = [
    { key: 'milk', name: { en: 'Milk', 'zh-TW': '奶' } },
    { key: 'eggs', name: { en: 'Eggs', 'zh-TW': '蛋' } },
    { key: 'peanuts', name: { en: 'Peanuts', 'zh-TW': '花生' } },
    { key: 'tree-nuts', name: { en: 'Tree Nuts', 'zh-TW': '堅果' } },
    { key: 'fish', name: { en: 'Fish', 'zh-TW': '魚' } },
    { key: 'shellfish', name: { en: 'Shellfish', 'zh-TW': '甲殼類' } },
    { key: 'soy', name: { en: 'Soy', 'zh-TW': '大豆' } },
    { key: 'wheat', name: { en: 'Wheat', 'zh-TW': '小麥' } },
    { key: 'sesame', name: { en: 'Sesame', 'zh-TW': '芝麻' } },
    { key: 'crustaceans', name: { en: 'Crustaceans', 'zh-TW': '甲殼類動物' } },
  ];

  let createdCount = 0;
  for (const allergen of allergensToSeed) {
    if (!existingKeys.has(allergen.key)) {
      await allergenRepository.create(allergen);
      createdCount++;
    }
  }

  return createdCount;
}

export async function seedDietaryMarkers() {
  const existingMarkers = await dietaryMarkerRepository.list({
    isActive: undefined,
  });
  const existingKeys = new Set(existingMarkers.map((m) => m.key));

  const markersToSeed: CreateDietaryMarkerInput[] = [
    {
      key: 'vegetarian',
      name: { en: 'Vegetarian', 'zh-TW': '蛋奶素' },
      type: 'dietary',
    },
    { key: 'vegan', name: { en: 'Vegan', 'zh-TW': '全素' }, type: 'dietary' },
    {
      key: 'gluten-free',
      name: { en: 'Gluten-Free', 'zh-TW': '無麩質' },
      type: 'dietary',
    },
    {
      key: 'halal',
      name: { en: 'Halal', 'zh-TW': '清真' },
      type: 'regulatory',
    },
    {
      key: 'kosher',
      name: { en: 'Kosher', 'zh-TW': '猶太潔食' },
      type: 'regulatory',
    },
    { key: 'spicy', name: { en: 'Spicy', 'zh-TW': '辣' }, type: 'dietary' },
  ];

  let createdCount = 0;
  for (const marker of markersToSeed) {
    if (!existingKeys.has(marker.key)) {
      await dietaryMarkerRepository.create(marker);
      createdCount++;
    }
  }

  return createdCount;
}

export async function seedOrganizations(count = 10) {
  // Use a fixed seed for reproducible fake data (idempotency across runs)
  faker.seed(123);
  let createdCount = 0;

  for (let i = 0; i < count; i++) {
    const name = faker.company.name();
    const slug = toSeedSlug(name, i);

    const input: CreateOrganizationInput = {
      name,
      slug,
      contactEmail: `owner+${i + 1}@${slug}.example.com`,
      contactPhone: buildSeedPhone(i),
      address: buildSeedAddress(i),
    };

    const existingOrg = await organizationRepository.findByName(name);
    if (existingOrg) {
      continue;
    }

    await organizationRepository.create(input);
    createdCount++;
  }

  return createdCount;
}
