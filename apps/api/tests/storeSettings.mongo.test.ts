import { describe, expect, it } from 'vitest';

import { StoreSettingsMongoModel } from '../src/models/storeSettings/mongo.js';

describe('StoreSettingsMongoModel', () => {
  it('accepts the MVP store settings shape', () => {
    const storeSettings = new StoreSettingsMongoModel({
      id: 'store-settings-1',
      organizationId: 'org-1',
      displayName: {
        en: 'Main Street Cafe',
      },
      description: {
        'zh-TW': '主街咖啡',
      },
      defaultLocale: 'en',
      supportedLocales: ['en', 'zh-TW'],
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
    });

    expect(storeSettings.validateSync()).toBeUndefined();
  });

  it('defaults to dine-in pay-later and takeaway pay-first order modes', () => {
    const storeSettings = new StoreSettingsMongoModel({
      id: 'store-settings-1',
      organizationId: 'org-1',
      displayName: {
        en: 'Main Street Cafe',
      },
    });

    expect(storeSettings.validateSync()).toBeUndefined();
    expect(storeSettings.orderModes).toMatchObject([
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

  it('requires a display name value for the default locale', () => {
    const storeSettings = new StoreSettingsMongoModel({
      id: 'store-settings-1',
      organizationId: 'org-1',
      displayName: {
        en: 'Main Street Cafe',
      },
      defaultLocale: 'zh-TW',
      supportedLocales: ['en', 'zh-TW'],
    });

    expect(storeSettings.validateSync()?.errors.displayName?.message).toBe(
      'displayName must have a value for defaultLocale',
    );
  });

  it('requires supported locales to include the default locale', () => {
    const storeSettings = new StoreSettingsMongoModel({
      id: 'store-settings-1',
      organizationId: 'org-1',
      displayName: {
        'zh-TW': '主街咖啡',
      },
      defaultLocale: 'zh-TW',
      supportedLocales: ['en'],
    });

    expect(storeSettings.validateSync()?.errors.supportedLocales?.message).toBe(
      'supportedLocales must include defaultLocale',
    );
  });

  it('validates service fee rate and order mode checkout mode', () => {
    const storeSettings = new StoreSettingsMongoModel({
      id: 'store-settings-1',
      organizationId: 'org-1',
      displayName: {
        en: 'Main Street Cafe',
      },
      serviceFeeRate: 1.5,
      orderModes: [
        {
          type: 'dine_in',
          isEnabled: true,
          checkoutMode: 'unknown',
        },
      ],
    });

    const errors = storeSettings.validateSync()?.errors;

    expect(errors?.serviceFeeRate?.message).toBe(
      'Path `serviceFeeRate` (1.5) is more than maximum allowed value (1).',
    );
    expect(errors?.['orderModes.0.checkoutMode']?.message).toContain(
      '`unknown` is not a valid enum value',
    );
  });

  it('requires at least one order mode', () => {
    const storeSettings = new StoreSettingsMongoModel({
      id: 'store-settings-1',
      organizationId: 'org-1',
      displayName: {
        en: 'Main Street Cafe',
      },
      orderModes: [],
    });

    expect(storeSettings.validateSync()?.errors.orderModes?.message).toBe(
      'orderModes must include at least one order mode',
    );
  });

  it('requires unique order mode types', () => {
    const storeSettings = new StoreSettingsMongoModel({
      id: 'store-settings-1',
      organizationId: 'org-1',
      displayName: {
        en: 'Main Street Cafe',
      },
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
    });

    expect(storeSettings.validateSync()?.errors.orderModes?.message).toBe(
      'orderModes cannot contain duplicate types',
    );
  });

  it('requires at least one enabled order mode', () => {
    const storeSettings = new StoreSettingsMongoModel({
      id: 'store-settings-1',
      organizationId: 'org-1',
      displayName: {
        en: 'Main Street Cafe',
      },
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
    });

    expect(storeSettings.validateSync()?.errors.orderModes?.message).toBe(
      'orderModes must include at least one enabled order mode',
    );
  });
});
