import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import {
  getSheetTitle,
  getSpreadsheetId,
  parseLanguages,
  readCredentialConfig,
} from './i18n-utils.mjs';

const metadataHeaders = ['key', 'default'];

export async function loadI18nSheet() {
  const credentials = readCredentialConfig();
  const serviceAccountAuth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const document = new GoogleSpreadsheet(
    getSpreadsheetId(),
    serviceAccountAuth,
  );

  await document.loadInfo();

  const sheetTitle = getSheetTitle();
  const sheet = sheetTitle
    ? document.sheetsByTitle[sheetTitle]
    : document.sheetsByIndex[0];

  if (!sheet) {
    throw new Error(
      sheetTitle
        ? `Sheet "${sheetTitle}" was not found.`
        : 'The spreadsheet does not have any sheets.',
    );
  }

  await ensureHeaders(sheet);

  return sheet;
}

export async function ensureHeaders(sheet) {
  const languages = parseLanguages();
  const requiredHeaders = [...metadataHeaders, ...languages, 'description'];

  try {
    await sheet.loadHeaderRow();
  } catch {
    await sheet.setHeaderRow(requiredHeaders);
    return requiredHeaders;
  }

  const existingHeaders = sheet.headerValues ?? [];

  if (!existingHeaders.includes('key')) {
    await sheet.setHeaderRow(requiredHeaders);
    return requiredHeaders;
  }

  const nextHeaders = [...existingHeaders];

  for (const header of requiredHeaders) {
    if (!nextHeaders.includes(header)) {
      nextHeaders.push(header);
    }
  }

  if (nextHeaders.length !== existingHeaders.length) {
    await sheet.setHeaderRow(nextHeaders);
  }

  return nextHeaders;
}

export function getLanguageColumns(headers) {
  const ignoredHeaders = new Set([...metadataHeaders, 'id', 'description']);

  return headers.filter((header) => header && !ignoredHeaders.has(header));
}
