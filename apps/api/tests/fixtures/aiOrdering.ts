import type { CartDto, PublicMenuDto } from '@repo/shared';

/**
 * Frozen menu and cart for AI ordering tests, and the baseline for version
 * replay.
 *
 * Replay compares a prompt version against a model, so the menu underneath has
 * to be the one thing that does not move. Running replay against live store data
 * would leave a difference in output unattributable: prompt, model, or a menu
 * someone edited that morning.
 *
 * It deliberately carries every shape the validation stage has to handle: a
 * sold-out product, a sold-out option, required and optional modifiers, a
 * product with no modifiers at all, several similarly named drinks, and a cart
 * with two participants so ownership rules are exercisable.
 */

export const AI_ORDERING_FIXTURE_STORE_ID = 'store-ai-eval';
export const AI_ORDERING_FIXTURE_CART_ID = 'cart-ai-eval';
export const AI_ORDERING_FIXTURE_PARTICIPANT_SELF = 'participant-self';
export const AI_ORDERING_FIXTURE_PARTICIPANT_OTHER = 'participant-other';

export const AI_ORDERING_MENU_FIXTURE: PublicMenuDto = {
  groups: [
    {
      category: {
        id: 'cat-drink',
        name: { 'zh-TW': '飲料', en: 'Drinks' },
        displayOrder: 1,
        availabilityRules: [],
      },
      products: [
        {
          id: 'prod-milk-tea',
          categoryIds: ['cat-drink'],
          name: { 'zh-TW': '珍珠奶茶', en: 'Bubble milk tea' },
          description: {
            'zh-TW': '錫蘭紅茶加鮮奶與珍珠',
            en: 'Ceylon tea with milk and pearls',
          },
          imageUrls: [],
          price: 60,
          tagIds: ['tag-hot'],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: ['mod-sugar', 'mod-ice', 'mod-topping'],
          isSoldOut: false,
        },
        {
          // Similar name to the milk tea: the ambiguity case.
          id: 'prod-milk-green',
          categoryIds: ['cat-drink'],
          name: { 'zh-TW': '翠玉奶綠', en: 'Jade milk green tea' },
          imageUrls: [],
          price: 60,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: ['mod-sugar', 'mod-ice', 'mod-topping'],
          isSoldOut: false,
        },
        {
          id: 'prod-black-tea',
          categoryIds: ['cat-drink'],
          name: { 'zh-TW': '紅茶', en: 'Black tea' },
          imageUrls: [],
          price: 35,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: ['mod-sugar', 'mod-ice'],
          isSoldOut: false,
        },
      ],
    },
    {
      category: {
        id: 'cat-main',
        name: { 'zh-TW': '主餐', en: 'Mains' },
        displayOrder: 2,
        availabilityRules: [],
      },
      products: [
        {
          id: 'prod-beef-noodle',
          categoryIds: ['cat-main'],
          name: { 'zh-TW': '牛肉麵', en: 'Beef noodle soup' },
          imageUrls: [],
          price: 180,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: ['mod-spice'],
          isSoldOut: false,
        },
        {
          // The sold-out product.
          id: 'prod-fried-chicken',
          categoryIds: ['cat-main'],
          name: { 'zh-TW': '香雞排', en: 'Fried chicken cutlet' },
          imageUrls: [],
          price: 90,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: true,
        },
      ],
    },
    {
      category: null,
      products: [
        {
          // No modifiers at all: the simplest valid path.
          id: 'prod-rice',
          categoryIds: [],
          name: { 'zh-TW': '白飯', en: 'Steamed rice' },
          imageUrls: [],
          price: 20,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
      ],
    },
  ],
  modifiers: [
    {
      id: 'mod-sugar',
      name: { 'zh-TW': '甜度', en: 'Sweetness' },
      selectionType: 'single_choice',
      minSelect: 1,
      maxSelect: 1,
      options: [
        {
          id: 'opt-sugar-full',
          name: { 'zh-TW': '全糖', en: 'Full sugar' },
          priceAdjustment: 0,
          isDefault: true,
          isSoldOut: false,
        },
        {
          id: 'opt-sugar-half',
          name: { 'zh-TW': '半糖', en: 'Half sugar' },
          priceAdjustment: 0,
          isDefault: false,
          isSoldOut: false,
        },
        {
          id: 'opt-sugar-free',
          name: { 'zh-TW': '無糖', en: 'No sugar' },
          priceAdjustment: 0,
          isDefault: false,
          isSoldOut: false,
        },
      ],
    },
    {
      id: 'mod-ice',
      name: { 'zh-TW': '冰塊', en: 'Ice' },
      selectionType: 'single_choice',
      minSelect: 1,
      maxSelect: 1,
      options: [
        {
          id: 'opt-ice-normal',
          name: { 'zh-TW': '正常冰', en: 'Regular ice' },
          priceAdjustment: 0,
          isDefault: true,
          isSoldOut: false,
        },
        {
          id: 'opt-ice-less',
          name: { 'zh-TW': '少冰', en: 'Less ice' },
          priceAdjustment: 0,
          isDefault: false,
          isSoldOut: false,
        },
        {
          id: 'opt-ice-none',
          name: { 'zh-TW': '去冰', en: 'No ice' },
          priceAdjustment: 0,
          isDefault: false,
          isSoldOut: false,
        },
      ],
    },
    {
      id: 'mod-spice',
      name: { 'zh-TW': '辣度', en: 'Spice level' },
      selectionType: 'single_choice',
      minSelect: 1,
      maxSelect: 1,
      options: [
        {
          id: 'opt-spice-none',
          name: { 'zh-TW': '不辣', en: 'Not spicy' },
          priceAdjustment: 0,
          isDefault: true,
          isSoldOut: false,
        },
        {
          id: 'opt-spice-mild',
          name: { 'zh-TW': '小辣', en: 'Mild' },
          priceAdjustment: 0,
          isDefault: false,
          isSoldOut: false,
        },
        {
          // The sold-out option: a guest cannot fix this by choosing again.
          id: 'opt-spice-hot',
          name: { 'zh-TW': '大辣', en: 'Hot' },
          priceAdjustment: 0,
          isDefault: false,
          isSoldOut: true,
        },
      ],
    },
    {
      // The optional modifier: min 0, so omitting it entirely is valid.
      id: 'mod-topping',
      name: { 'zh-TW': '加料', en: 'Toppings' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 3,
      options: [
        {
          id: 'opt-topping-pearl',
          name: { 'zh-TW': '珍珠', en: 'Pearls' },
          priceAdjustment: 10,
          isDefault: false,
          isSoldOut: false,
        },
        {
          id: 'opt-topping-pudding',
          name: { 'zh-TW': '布丁', en: 'Pudding' },
          priceAdjustment: 15,
          isDefault: false,
          isSoldOut: false,
        },
        {
          id: 'opt-topping-grass',
          name: { 'zh-TW': '仙草', en: 'Grass jelly' },
          priceAdjustment: 10,
          isDefault: false,
          isSoldOut: false,
        },
      ],
    },
  ],
  tags: [{ id: 'tag-hot', name: { 'zh-TW': '熱銷', en: 'Popular' } }],
  allergens: [
    { id: 'allergen-peanut', name: { 'zh-TW': '花生', en: 'Peanut' } },
  ],
  dietaryMarkers: [
    { id: 'diet-veg', name: { 'zh-TW': '素食', en: 'Vegetarian' } },
  ],
};

const FIXTURE_TIMESTAMP = '2026-09-30T00:00:00.000Z';

export const AI_ORDERING_CART_FIXTURE: CartDto = {
  id: AI_ORDERING_FIXTURE_CART_ID,
  storeId: AI_ORDERING_FIXTURE_STORE_ID,
  orderType: 'dine_in',
  checkoutMode: 'pay_later',
  status: 'active',
  participants: [
    {
      id: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
      avatarKey: 'owl',
      displayName: 'Ana',
      joinedAt: FIXTURE_TIMESTAMP,
    },
    {
      id: AI_ORDERING_FIXTURE_PARTICIPANT_OTHER,
      avatarKey: 'bear',
      displayName: 'Ben',
      joinedAt: FIXTURE_TIMESTAMP,
    },
  ],
  items: [
    {
      id: 'item-own-milk-tea',
      productId: 'prod-milk-tea',
      productName: { 'zh-TW': '珍珠奶茶', en: 'Bubble milk tea' },
      quantity: 1,
      unitPrice: 60,
      selectedOptions: [
        {
          modifierId: 'mod-sugar',
          modifierName: { 'zh-TW': '甜度', en: 'Sweetness' },
          optionId: 'opt-sugar-half',
          optionName: { 'zh-TW': '半糖', en: 'Half sugar' },
          priceAdjustment: 0,
        },
        {
          modifierId: 'mod-ice',
          modifierName: { 'zh-TW': '冰塊', en: 'Ice' },
          optionId: 'opt-ice-less',
          optionName: { 'zh-TW': '少冰', en: 'Less ice' },
          priceAdjustment: 0,
        },
      ],
      addedByParticipantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
      participantDisplayName: 'Ana',
      totalItemPrice: 60,
      createdAt: FIXTURE_TIMESTAMP,
    },
    {
      id: 'item-own-rice',
      productId: 'prod-rice',
      productName: { 'zh-TW': '白飯', en: 'Steamed rice' },
      quantity: 2,
      unitPrice: 20,
      selectedOptions: [],
      addedByParticipantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
      participantDisplayName: 'Ana',
      totalItemPrice: 40,
      createdAt: FIXTURE_TIMESTAMP,
    },
    {
      // Exists solely so ownership rejection is testable.
      id: 'item-other-beef',
      productId: 'prod-beef-noodle',
      productName: { 'zh-TW': '牛肉麵', en: 'Beef noodle soup' },
      quantity: 1,
      unitPrice: 180,
      selectedOptions: [
        {
          modifierId: 'mod-spice',
          modifierName: { 'zh-TW': '辣度', en: 'Spice level' },
          optionId: 'opt-spice-mild',
          optionName: { 'zh-TW': '小辣', en: 'Mild' },
          priceAdjustment: 0,
        },
      ],
      addedByParticipantId: AI_ORDERING_FIXTURE_PARTICIPANT_OTHER,
      participantDisplayName: 'Ben',
      totalItemPrice: 180,
      createdAt: FIXTURE_TIMESTAMP,
    },
  ],
  subtotal: 280,
  serviceFeeRate: 0.1,
  serviceFeeAmount: 28,
  totalAmount: 308,
  expiresAt: '2026-09-30T12:00:00.000Z',
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
};
