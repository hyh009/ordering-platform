import { loadI18nSheet } from './i18n-sheet.mjs';
import { parseLanguages, scanI18nDefaults } from './i18n-utils.mjs';

const entries = scanI18nDefaults();
const sheet = await loadI18nSheet();
const headers = sheet.headerValues ?? [];
const rows = await sheet.getRows();
const rowsByKey = new Map();

for (const row of rows) {
  const key = String(row.get('key') ?? '').trim();

  if (key) {
    rowsByKey.set(key, row);
  }
}

const languages = parseLanguages();
const missingRows = [];
let updatedDefaults = 0;

for (const entry of entries) {
  const row = rowsByKey.get(entry.key);

  if (!row) {
    const rowData = {
      key: entry.key,
      default: entry.defaultValue,
    };

    for (const language of languages) {
      rowData[language] = language === 'en' ? entry.defaultValue : '';
    }

    missingRows.push(rowData);
    continue;
  }

  const currentDefault = String(row.get('default') ?? '');

  if (currentDefault !== entry.defaultValue) {
    row.set('default', entry.defaultValue);

    if (headers.includes('en') && !row.get('en')) {
      row.set('en', entry.defaultValue);
    }

    await row.save();
    updatedDefaults += 1;
  }
}

if (missingRows.length > 0) {
  await sheet.addRows(missingRows);
}

console.log(
  [
    `Scanned ${entries.length} i18n strings.`,
    `Added ${missingRows.length} missing Sheet rows.`,
    `Updated ${updatedDefaults} default strings.`,
  ].join('\n'),
);
