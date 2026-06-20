import { randomUUID } from 'node:crypto';

import { faker } from '@faker-js/faker';
import { allergenRepository } from '@src/repositories/allergen/repository';
import { categoryRepository } from '@src/repositories/category/repository';
import { dietaryMarkerRepository } from '@src/repositories/dietaryMarker/repository';
import { organizationRepository } from '@src/repositories/organization/repository';
import { productRepository } from '@src/repositories/product/repository';
import { productModifierRepository } from '@src/repositories/productModifier/repository';
import { tagRepository } from '@src/repositories/tag/repository';

import type { CreateAllergenInput } from '@src/repositories/allergen/repository';
import type { CreateDietaryMarkerInput } from '@src/repositories/dietaryMarker/repository';
import type { CreateOrganizationInput } from '@src/repositories/organization/repository';
import type { CreateProductInput } from '@src/repositories/product/repository';

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
    { key: 'milk',        name: { en: 'Milk',        'zh-TW': '奶' } },
    { key: 'eggs',        name: { en: 'Eggs',        'zh-TW': '蛋' } },
    { key: 'peanuts',     name: { en: 'Peanuts',     'zh-TW': '花生' } },
    { key: 'tree-nuts',   name: { en: 'Tree Nuts',   'zh-TW': '堅果' } },
    { key: 'fish',        name: { en: 'Fish',        'zh-TW': '魚' } },
    { key: 'shellfish',   name: { en: 'Shellfish',   'zh-TW': '甲殼類' } },
    { key: 'soy',         name: { en: 'Soy',         'zh-TW': '大豆' } },
    { key: 'wheat',       name: { en: 'Wheat',       'zh-TW': '小麥' } },
    { key: 'sesame',      name: { en: 'Sesame',      'zh-TW': '芝麻' } },
    { key: 'crustaceans', name: { en: 'Crustaceans', 'zh-TW': '甲殼類動物' } },
    { key: 'celery',      name: { en: 'Celery',      'zh-TW': '芹菜' } },
    { key: 'mustard',     name: { en: 'Mustard',     'zh-TW': '芥末' } },
    { key: 'sulfites',    name: { en: 'Sulphites',   'zh-TW': '亞硫酸鹽' } },
    { key: 'molluscs',    name: { en: 'Molluscs',    'zh-TW': '軟體動物' } },
    { key: 'lupin',       name: { en: 'Lupin',       'zh-TW': '羽扇豆' } },
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

// ─── Breakfast Lab (早餐研究所) ────────────────────────────────────────────

const BL_STORE_ID = 'store-eedd136b-d03b-4858-b105-969abaf3ffb3';
const BL_ORG_ID = 'org-707b12d4-8e10-48ca-b802-60e20af4cde6';

// Existing category IDs
const BL_CAT = {
  drink:      'category-f6f2e597-49fe-4974-89ce-8d1342b6099b',
  omelette:   'category-cac4bea8-e886-4984-b115-3fe491523090',
  toast:      'category-d603776c-5fcc-49d9-bb52-c8057d92ec2b',
  burger:     'category-ee6154f8-6801-4616-a3e7-20dc696f011e',
  thickToast: 'category-507714f6-90c4-4dc9-b788-7a9296ae3c76',
} as const;

// Existing modifier IDs
const BL_MOD = {
  temperature: 'product-modifier-ee999a41-ece5-46b4-9e22-87fc0cb6ffa0',
  addOn:       'product-modifier-0e4b8ef0-2a59-482a-a637-9db78e9a23f2',
  sweetness:   'product-modifier-8a114c4d-e588-4c47-a1c8-d33ca049302b',
} as const;

const BL_HAM_EGG_TOAST_ID = 'product-a437a179-4cfc-403a-93ec-da63d6357530';

function blModOpt(
  zhName: string,
  enName: string | undefined,
  priceAdjustment: number,
  isDefault: boolean,
) {
  return {
    id: `product-modifier-option-${randomUUID()}`,
    name: enName ? { 'zh-TW': zhName, en: enName } : { 'zh-TW': zhName },
    priceAdjustment,
    isDefault,
    isActive: true as const,
    isSoldOut: false as const,
  };
}

export async function seedBreakfastLab() {
  const storeId = BL_STORE_ID;
  const organizationId = BL_ORG_ID;

  // ── 1. Update existing category names ────────────────────────────────────
  await categoryRepository.update(BL_CAT.toast, {
    name: { 'zh-TW': '烤吐司', en: 'Toast' },
  });
  await categoryRepository.update(BL_CAT.thickToast, {
    name: { 'zh-TW': '烤厚片', en: 'Thick Toast' },
  });

  // ── 2. Find/rename 點心 category (was 炒麵) ───────────────────────────────
  const allCats = await categoryRepository.listByStore({ storeId });
  const existingSnacks = allCats.find(
    (c) => c.name['zh-TW'] === '炒麵' || c.name['zh-TW'] === '點心',
  );
  const snacksCatId = existingSnacks
    ? existingSnacks.id
    : (
        await categoryRepository.create({
          organizationId,
          storeId,
          name: { 'zh-TW': '點心', en: 'Snacks' },
          displayOrder: 5,
        })
      ).id;

  if (existingSnacks?.name['zh-TW'] === '炒麵') {
    await categoryRepository.update(existingSnacks.id, {
      name: { 'zh-TW': '點心', en: 'Snacks' },
    });
  }

  // ── 3. Create 鐵板麵 category (idempotent) ────────────────────────────────
  const existingTeppan = allCats.find((c) => c.name['zh-TW'] === '鐵板麵');
  const teppanCatId = existingTeppan
    ? existingTeppan.id
    : (
        await categoryRepository.create({
          organizationId,
          storeId,
          name: { 'zh-TW': '鐵板麵', en: 'Teppan Noodles' },
          displayOrder: 6,
        })
      ).id;

  // ── 4. Create 尺寸 modifier (idempotent) ──────────────────────────────────
  const allMods = await productModifierRepository.listByStore({ storeId });
  const existingSizeMod = allMods.find((m) => m.name['zh-TW'] === '尺寸');
  const sizeModId = existingSizeMod
    ? existingSizeMod.id
    : (
        await productModifierRepository.create({
          organizationId,
          storeId,
          name: { 'zh-TW': '尺寸', en: 'Size' },
          selectionType: 'single_choice',
          minSelect: 1,
          maxSelect: 1,
          options: [
            blModOpt('小', 'Small', 0, true),
            blModOpt('大', 'Large', 5, false),
          ],
        })
      ).id;

  // ── 5. Update existing 火腿蛋吐司 ────────────────────────────────────────
  await productRepository.update(BL_HAM_EGG_TOAST_ID, {
    price: 25,
    modifierIds: [BL_MOD.addOn],
  });

  // ── 6. Seed spicy tag (idempotent) ───────────────────────────────────────
  const existingTags = await tagRepository.listByStore({ storeId });
  const existingSpicyTag = existingTags.find((t) => t.name['zh-TW'] === '辣');
  const spicyTagId = existingSpicyTag
    ? existingSpicyTag.id
    : (
        await tagRepository.create({
          organizationId,
          storeId,
          name: { 'zh-TW': '辣', en: 'Spicy' },
          color: '#e53e3e',
        })
      ).id;

  // ── 7. Upsert products (create new, update English name + tags if missing) ─
  const existingProducts = await productRepository.listByStore({ storeId });
  const existingByZhName = new Map(
    existingProducts
      .filter((p) => Boolean(p.name['zh-TW']))
      .map((p) => [p.name['zh-TW'] as string, p]),
  );

  let count = 0;

  type ProductSpec = {
    zhName: string;
    enName: string;
    price: number;
    categoryId: string;
    modifierIds: string[];
    tagIds?: string[];
  };

  async function upsertProduct(spec: ProductSpec) {
    const existing = existingByZhName.get(spec.zhName);
    if (existing) {
      // Patch missing English name or missing tags
      const needsEnName = !existing.name.en;
      const needsTags =
        spec.tagIds?.length &&
        !spec.tagIds.every((id) => existing.tagIds?.includes(id));
      const isTeppan =
        spec.categoryId === teppanCatId &&
        !existing.categoryIds.includes(teppanCatId);

      if (needsEnName || needsTags || isTeppan) {
        await productRepository.update(existing.id, {
          ...(needsEnName ? { name: { ...existing.name, en: spec.enName } } : {}),
          ...(needsTags ? { tagIds: spec.tagIds } : {}),
          ...(isTeppan ? { categoryIds: [teppanCatId] } : {}),
        });
      }
      return;
    }

    await productRepository.create({
      organizationId,
      storeId,
      name: { 'zh-TW': spec.zhName, en: spec.enName },
      price: spec.price,
      categoryIds: [spec.categoryId],
      modifierIds: spec.modifierIds,
      tagIds: spec.tagIds ?? [],
      status: 'published',
    });
    count++;
  }

  // 蛋餅 → 加點
  for (const [zhName, enName, price] of [
    ['原味蛋餅',   'Original Egg Crepe',         20],
    ['火腿蛋餅',   'Ham Egg Crepe',               30],
    ['起士蛋餅',   'Cheese Egg Crepe',            30],
    ['肉鬆蛋餅',   'Pork Floss Egg Crepe',        30],
    ['培根蛋餅',   'Bacon Egg Crepe',             30],
    ['玉米蛋餅',   'Corn Egg Crepe',              30],
    ['蔬菜蛋餅',   'Veggie Egg Crepe',            30],
    ['鮪魚蛋餅',   'Tuna Egg Crepe',              35],
    ['薯餅蛋餅',   'Hash Brown Egg Crepe',        35],
    ['豬肉蛋餅',   'Pork Egg Crepe',              35],
    ['香雞蛋餅',   'Chicken Egg Crepe',           35],
  ] as [string, string, number][]) {
    await upsertProduct({ zhName, enName, price, categoryId: BL_CAT.omelette, modifierIds: [BL_MOD.addOn] });
  }

  // 辣菜圃蛋餅 → 加點 + 辣 tag
  await upsertProduct({
    zhName: '辣菜圃蛋餅',
    enName: 'Spicy Pickled Radish Egg Crepe',
    price: 35,
    categoryId: BL_CAT.omelette,
    modifierIds: [BL_MOD.addOn],
    tagIds: [spicyTagId],
  });

  // 漢堡 → 加點
  for (const [zhName, enName, price] of [
    ['豬肉蛋堡',   'Pork Egg Burger',             35],
    ['香雞蛋堡',   'Chicken Egg Burger',          35],
    ['薯餅蛋堡',   'Hash Brown Egg Burger',       35],
    ['鮪魚蛋堡',   'Tuna Egg Burger',             35],
    ['豬排蛋堡',   'Pork Cutlet Egg Burger',      40],
    ['牛排蛋堡',   'Beef Steak Egg Burger',       45],
    ['卡拉雞腿堡', 'Crispy Chicken Burger',       45],
    ['總匯吐司/堡', 'Club Toast / Burger',        45],
  ] as [string, string, number][]) {
    await upsertProduct({ zhName, enName, price, categoryId: BL_CAT.burger, modifierIds: [BL_MOD.addOn] });
  }

  // 烤吐司 → 加點（火腿蛋吐司已存在，跳過）
  for (const [zhName, enName, price] of [
    ['烤煎蛋吐司', 'Fried Egg Toast',             20],
    ['起士蛋吐司', 'Cheese Egg Toast',            25],
    ['培根蛋吐司', 'Bacon Egg Toast',             25],
    ['肉鬆蛋吐司', 'Pork Floss Egg Toast',        25],
    ['豬肉蛋吐司', 'Pork Egg Toast',              30],
    ['香雞蛋吐司', 'Chicken Egg Toast',           30],
    ['鮪魚蛋吐司', 'Tuna Egg Toast',              35],
    ['豬排蛋吐司', 'Pork Cutlet Toast',           40],
    ['牛排蛋吐司', 'Beef Steak Toast',            40],
  ] as [string, string, number][]) {
    await upsertProduct({ zhName, enName, price, categoryId: BL_CAT.toast, modifierIds: [BL_MOD.addOn] });
  }

  // 烤厚片 → 無 modifier
  for (const [zhName, enName, price] of [
    ['奶油厚片',   'Butter Toast (Thick)',        25],
    ['奶油薄片',   'Butter Toast (Thin)',         15],
    ['花生厚片',   'Peanut Toast (Thick)',        25],
    ['花生薄片',   'Peanut Toast (Thin)',         15],
    ['草莓厚片',   'Strawberry Toast (Thick)',    25],
    ['草莓薄片',   'Strawberry Toast (Thin)',     15],
    ['巧克力厚片', 'Chocolate Toast (Thick)',     25],
    ['巧克力薄片', 'Chocolate Toast (Thin)',      15],
  ] as [string, string, number][]) {
    await upsertProduct({ zhName, enName, price, categoryId: BL_CAT.thickToast, modifierIds: [] });
  }

  // 鐵板麵 → 無 modifier（從點心遷移過來）
  for (const [zhName, enName, price] of [
    ['黑胡椒鐵板麵', 'Black Pepper Teppan Noodles', 40],
    ['蘑菇鐵板麵',   'Mushroom Teppan Noodles',     40],
  ] as [string, string, number][]) {
    await upsertProduct({ zhName, enName, price, categoryId: teppanCatId, modifierIds: [] });
  }

  // 點心 → 無 modifier
  for (const [zhName, enName, price] of [
    ['蘿蔔糕',     'Pan-Fried Radish Cake',           25],
    ['蘿蔔糕加蛋', 'Pan-Fried Radish Cake with Egg',  35],
    ['煎餃',       'Pan-Fried Dumplings',              25],
    ['煎餃加蛋',   'Pan-Fried Dumplings with Egg',    35],
    ['雞塊一份',   'Chicken Nuggets',                 25],
    ['熱狗一份',   'Hot Dog',                         25],
    ['薯餅一份',   'Hash Brown',                      15],
    ['煎荷包蛋',   'Fried Egg',                       10],
    ['蔥抓餅加蛋', 'Scallion Pancake with Egg',       35],
    ['卡拉雞腿排', 'Crispy Chicken Cutlet',           30],
    ['煎牛排',     'Pan-Fried Beef Steak',            25],
    ['煎豬排',     'Pan-Fried Pork Cutlet',           20],
  ] as [string, string, number][]) {
    await upsertProduct({ zhName, enName, price, categoryId: snacksCatId, modifierIds: [] });
  }

  // 飲料 → 溫度 + 甜度 + 尺寸
  const drinkMods = [BL_MOD.temperature, BL_MOD.sweetness, sizeModId];
  for (const [zhName, enName, price] of [
    ['紅茶',       'Black Tea',                   15],
    ['奶茶',       'Milk Tea',                    15],
    ['豆漿',       'Soy Milk',                    20],
    ['鮮奶茶',     'Fresh Milk Tea',              20],
    ['三合一咖啡', '3-in-1 Coffee',              20],
    ['冰無糖綠茶', 'Iced Unsweetened Green Tea',  15],
  ] as [string, string, number][]) {
    await upsertProduct({ zhName, enName, price, categoryId: BL_CAT.drink, modifierIds: drinkMods });
  }

  return count;
}
