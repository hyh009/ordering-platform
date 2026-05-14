import fs from 'node:fs';
import path from 'node:path';
import { getLanguageColumns, loadI18nSheet } from './i18n-sheet.mjs';
import {
  generatedResourcesPath,
  setDeep,
  toGeneratedResourceModule,
} from './i18n-utils.mjs';

const sheet = await loadI18nSheet();
const headers = sheet.headerValues ?? [];
const languageColumns = getLanguageColumns(headers);
const rows = await sheet.getRows();
const resources = {};
let generatedKeys = 0;

for (const language of languageColumns) {
  resources[language] = {
    translation: {},
  };
}

for (const row of rows) {
  const key = String(row.get('key') ?? '').trim();

  if (!key) {
    continue;
  }

  for (const language of languageColumns) {
    const value = String(row.get(language) ?? '').trim();

    if (value) {
      setDeep(resources[language].translation, key, value);
      generatedKeys += 1;
    }
  }
}

fs.mkdirSync(path.dirname(generatedResourcesPath), { recursive: true });
fs.writeFileSync(
  generatedResourcesPath,
  toGeneratedResourceModule(resources),
  'utf8',
);

console.log(
  `Generated ${generatedKeys} translated values in ${path.relative(
    process.cwd(),
    generatedResourcesPath,
  )}.`,
);
