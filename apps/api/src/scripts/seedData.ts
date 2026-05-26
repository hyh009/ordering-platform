import { faker } from '@faker-js/faker';
import { allergenRepository } from '@src/repositories/allergen/repository';
import { dietaryMarkerRepository } from '@src/repositories/dietaryMarker/repository';
import { organizationRepository } from '@src/repositories/organization/repository';

import type { CreateAllergenInput } from '@src/repositories/allergen/repository';
import type { CreateDietaryMarkerInput } from '@src/repositories/dietaryMarker/repository';
import type { CreateOrganizationInput } from '@src/repositories/organization/repository';

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

    const input: CreateOrganizationInput = {
      name,
      contactEmail: faker.internet.email(),
      contactPhone: {
        countryCode: 'TW',
        e164: '+886912345678',
        nationalNumber: '0912345678',
        type: 'mobile',
      },
      address: {
        countryCode: 'TW',
        schemaVersion: 1,
        formatted: '100台北市中正區忠孝西路一段1號',
        tw: {
          city: '台北市',
          district: '中正區',
          postalCode: '100',
          streetAddress: '忠孝西路一段1號',
        },
      },
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
