import { describe, expect, it } from 'vitest';

import { StoreMongoModel } from '../src/models/store/mongo.js';

const base = {
  id: 'store-1',
  organizationId: 'org-1',
  profile: { displayName: { en: 'Main Street Cafe' } },
  locale: {},
  operation: {},
};

describe('StoreMongoModel', () => {
  it('accepts the MVP store shape', () => {
    const store = new StoreMongoModel({
      ...base,
      profile: {
        displayName: {
          en: 'Main Street Cafe',
        },
        description: {
          'zh-TW': '主街咖啡',
        },
      },
      locale: {
        defaultLocale: 'en',
        supportedLocales: ['en', 'zh-TW'],
      },
      operation: {
        businessHours: [
          {
            dayOfWeek: 1,
            isOpen: true,
            openTime: '09:00',
            closeTime: '18:00',
          },
        ],
        serviceFeeRate: 0.1,
        orderModes: [
          {
            type: 'dine_in',
            isEnabled: true,
            checkoutMode: 'pay_later',
          },
          {
            type: 'takeaway',
            isEnabled: true,
            checkoutMode: 'pay_first',
          },
        ],
      },
      status: 'active',
    });

    expect(store.validateSync()).toBeUndefined();
  });

  it('defaults to dine-in pay-later and takeaway pay-first order modes', () => {
    const store = new StoreMongoModel({ ...base });

    expect(store.validateSync()).toBeUndefined();
    expect(store.operation.orderModes).toMatchObject([
      {
        type: 'dine_in',
        isEnabled: true,
        checkoutMode: 'pay_later',
      },
      {
        type: 'takeaway',
        isEnabled: true,
        checkoutMode: 'pay_first',
      },
    ]);
  });

  it('requires a display name value', () => {
    const store = new StoreMongoModel({
      ...base,
      profile: { displayName: {} },
      locale: { defaultLocale: 'zh-TW', supportedLocales: ['en', 'zh-TW'] },
    });

    expect(store.validateSync()?.errors['profile.displayName']?.message).toBe(
      'profile.displayName must have at least one localized value',
    );
  });

  it('requires supported locales to include the default locale', () => {
    const store = new StoreMongoModel({
      ...base,
      profile: { displayName: { 'zh-TW': '主街咖啡' } },
      locale: { defaultLocale: 'zh-TW', supportedLocales: ['en'] },
    });

    expect(
      store.validateSync()?.errors['locale.supportedLocales']?.message,
    ).toBe('supportedLocales must include defaultLocale');
  });

  it('validates service fee rate and order mode checkout mode', () => {
    const store = new StoreMongoModel({
      ...base,
      operation: {
        serviceFeeRate: 1.5,
        orderModes: [
          {
            type: 'dine_in',
            isEnabled: true,
            checkoutMode: 'unknown',
          },
        ],
      },
    });

    const errors = store.validateSync()?.errors;

    expect(errors?.['operation.serviceFeeRate']?.message).toBe(
      'Path `serviceFeeRate` (1.5) is more than maximum allowed value (1).',
    );
    expect(errors?.['operation.orderModes.0.checkoutMode']?.message).toContain(
      '`unknown` is not a valid enum value',
    );
  });

  it('requires at least one order mode', () => {
    const store = new StoreMongoModel({
      ...base,
      operation: { orderModes: [] },
    });

    expect(store.validateSync()?.errors['operation.orderModes']?.message).toBe(
      'orderModes must include at least one order mode',
    );
  });

  it('requires unique order mode types', () => {
    const store = new StoreMongoModel({
      ...base,
      operation: {
        orderModes: [
          {
            type: 'dine_in',
            isEnabled: true,
            checkoutMode: 'pay_later',
          },
          {
            type: 'dine_in',
            isEnabled: true,
            checkoutMode: 'pay_first',
          },
        ],
      },
    });

    expect(store.validateSync()?.errors['operation.orderModes']?.message).toBe(
      'orderModes cannot contain duplicate types',
    );
  });

  it('requires at least one enabled order mode', () => {
    const store = new StoreMongoModel({
      ...base,
      operation: {
        orderModes: [
          {
            type: 'dine_in',
            isEnabled: false,
            checkoutMode: 'pay_later',
          },
          {
            type: 'takeaway',
            isEnabled: false,
            checkoutMode: 'pay_first',
          },
        ],
      },
    });

    expect(store.validateSync()?.errors['operation.orderModes']?.message).toBe(
      'orderModes must include at least one enabled order mode',
    );
  });
});
