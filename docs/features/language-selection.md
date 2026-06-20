# Language Selection

The app has two independent language contexts: the **management platform** and the
**storefront**. They use different selection logic, different storage keys, and
different change APIs so that a guest's storefront language choice never overwrites
a merchant's management preference, and vice versa.

---

## Management Platform

**Who uses it:** merchants, super-admins — the authenticated app shell and all
management pages.

**Storage key:** `ordering-platform.language` (see `languageStorageKey` in
`src/app/i18n/languages.ts`)

### How the language is resolved on load

i18next initialises with `LanguageDetector` configured to check
`['localStorage', 'navigator']` in that order, with `caches: []` so it never
auto-writes back to storage.

After the `AppLayout` mounts it also calls `initManagementLanguage()` (in a
`useEffect`). That function is the canonical first-visit logic:

```
1. localStorage has ordering-platform.language?
   → early return — use whatever is already there

2. Walk navigator.languages looking for an exact match in supportedLanguages
   (e.g. 'en', 'zh-TW')
   → if found, use it

3. Try browser language prefix (e.g. 'en-US' → 'en')
   → if found, use it

4. Nothing matched → default to 'zh-TW'
   (hardcoded in initManagementLanguage; NOT the same as fallbackLng)
```

> **Note:** `fallbackLng: 'en'` in the i18next config is the *translation
> fallback* (used when a key is missing), not the language default for first
> visits. On first visit with no browser match the user gets `zh-TW`, not `en`.

### Changing language

Call `useLanguageVM().changeLanguage(lang)`, which:
1. Calls `i18nInstance.changeLanguage(lang)` — takes effect immediately
2. Writes to `localStorage['ordering-platform.language']` — persists across sessions

---

## Storefront (前台)

**Who uses it:** guests ordering at a specific store.

**Storage key:** `sf_lang_{storeId}` — one key **per store**, not global.
(See `getStorefrontLangKey` in
`src/features/storeFront/components/storefrontLanguage.storage.ts`)

### How the language is resolved on load

Logic lives in `useStorefrontLanguagePrompt`, which runs inside `StoreFrontLayout`
and fires whenever the active store or storeId changes.

```
Store has only 1 supported locale?
  → silently apply it + save to sf_lang_{storeId}
  → no dialog shown

Store has 2+ supported locales:
  sf_lang_{storeId} exists AND is in store's supportedLocales?
    → silently apply it (changeLanguageTransient)
    → no dialog shown

  Otherwise (first visit, or previous choice no longer supported):
    → open the language selection dialog (StorefrontLanguageDialog)
    → user must actively choose — no browser-language auto-detection
```

> **No browser language auto-detection in storefront.** Unlike the management
> platform, the storefront never reads `navigator.languages`. If a guest has
> never visited a multi-locale store, they always see the language dialog.

### Changing language

Two entry points, both ultimately call `changeLanguageTransient(lang)`:

- **Language dialog** (`StorefrontLanguageDialog`) on first visit
- **Header menu** (`LogoMenuButton` in `StorefrontPageHeader`) for switching later

Both also write to `sf_lang_{storeId}` in localStorage.

`changeLanguageTransient` differs from the management `changeLanguage` in that it
does **not** write to `ordering-platform.language`, keeping the two contexts
independent:

```ts
// management — persists to ordering-platform.language
useLanguageVM().changeLanguage(lang);

// storefront — transient: changes active language, does NOT touch management key
changeLanguageTransient(lang);
```

---

## Supporting hooks and where to find things

| What | File |
|---|---|
| i18next init + storage key constant | `src/app/i18n/index.ts` |
| Supported languages + `defaultLanguage` | `src/app/i18n/languages.ts` |
| Management first-visit logic | `initManagementLanguage()` in `src/app/i18n/index.ts` |
| Management language VM (read + change) | `src/app/i18n/useLanguageVM.ts` |
| Storefront per-store storage key | `src/features/storeFront/components/storefrontLanguage.storage.ts` |
| Storefront supported-locale list | `useStorefrontSupportedLanguages` in `src/features/storeFront/components/` |
| Storefront first-visit + dialog logic | `useStorefrontLanguagePrompt` in `src/features/storeFront/components/` |
| Storefront header menu language switch | `useStorefrontHeaderMenu` in `src/features/storeFront/components/` |
