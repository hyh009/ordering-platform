import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(scriptDir, 'i18n.config.json');

export const webRoot = path.resolve(scriptDir, '..');
export const sourceRoot = path.join(webRoot, 'src');
export const generatedResourcesPath = path.join(
  sourceRoot,
  'app',
  'i18n',
  'resources.generated.ts',
);

const sourceFileExtensions = new Set(['.ts', '.tsx']);
const excludedPathParts = new Set(['node_modules', 'dist']);
let cachedConfig;

function readConfig() {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  if (!fs.existsSync(configPath)) {
    cachedConfig = null;
    return cachedConfig;
  }

  cachedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return cachedConfig;
}

function isSourceFile(filePath) {
  const parsed = path.parse(filePath);

  if (!sourceFileExtensions.has(parsed.ext)) {
    return false;
  }

  if (parsed.base.endsWith('.test.ts') || parsed.base.endsWith('.test.tsx')) {
    return false;
  }

  const relativePath = path.relative(sourceRoot, filePath);

  if (relativePath.startsWith('app/i18n/resources')) {
    return false;
  }

  return !relativePath
    .split(path.sep)
    .some((part) => excludedPathParts.has(part));
}

function listSourceFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!excludedPathParts.has(entry.name)) {
        files.push(...listSourceFiles(fullPath));
      }
      continue;
    }

    if (entry.isFile() && isSourceFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getStringLiteralValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  return null;
}

function isTDefaultCall(node) {
  return (
    ts.isIdentifier(node.expression) && node.expression.text === 'tDefault'
  );
}

function getLocation(sourceFile, node, filePath) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const relativePath = path
    .relative(webRoot, filePath)
    .replaceAll(path.sep, '/');

  return `${relativePath}:${position.line + 1}:${position.character + 1}`;
}

export function scanI18nDefaults() {
  const entries = new Map();
  const invalidCalls = [];

  for (const filePath of listSourceFiles(sourceRoot)) {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    function visit(node) {
      if (ts.isCallExpression(node) && isTDefaultCall(node)) {
        const [keyNode, defaultNode] = node.arguments;
        const key = keyNode ? getStringLiteralValue(keyNode) : null;
        const defaultValue = defaultNode
          ? getStringLiteralValue(defaultNode)
          : null;
        const location = getLocation(sourceFile, node, filePath);

        if (!key || defaultValue === null) {
          invalidCalls.push(location);
        } else {
          const existing = entries.get(key);

          if (existing) {
            existing.files.push(location);
            if (existing.defaultValue !== defaultValue) {
              invalidCalls.push(
                `${location} uses a different default for "${key}".`,
              );
            }
          } else {
            entries.set(key, {
              key,
              defaultValue,
              files: [location],
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  if (invalidCalls.length > 0) {
    throw new Error(
      [
        'All tDefault calls must use literal key and default string arguments.',
        ...invalidCalls.map((location) => `- ${location}`),
      ].join('\n'),
    );
  }

  return [...entries.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
}

export function setDeep(target, dottedPath, value) {
  const parts = String(dottedPath).split('.').filter(Boolean);

  if (parts.length === 0) {
    return;
  }

  let current = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];

    if (
      typeof current[key] !== 'object' ||
      current[key] === null ||
      Array.isArray(current[key])
    ) {
      current[key] = {};
    }

    current = current[key];
  }

  current[parts[parts.length - 1]] = value;
}

export function parseLanguages(value = process.env.I18N_LANGUAGES) {
  const config = readConfig();

  if (Array.isArray(config?.languages)) {
    return config.languages
      .map((language) => String(language).trim())
      .filter(Boolean);
  }

  return (value ?? 'en,zh-TW')
    .split(',')
    .map((language) => language.trim())
    .filter(Boolean);
}

export function readCredentialConfig() {
  const config = readConfig();
  const configuredCredentialPath = config?.credentialsPath;

  if (configuredCredentialPath) {
    return JSON.parse(
      fs.readFileSync(path.resolve(configuredCredentialPath), 'utf8'),
    );
  }

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialPath) {
    return JSON.parse(fs.readFileSync(path.resolve(credentialPath), 'utf8'));
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replaceAll('\\n', '\n');

  if (email && key) {
    return {
      client_email: email,
      private_key: key,
    };
  }

  throw new Error(
    'Set apps/web/scripts/i18n.config.json credentialsPath, GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.',
  );
}

export function getSpreadsheetId() {
  const config = readConfig();
  const spreadsheetId =
    config?.spreadsheetId ?? process.env.I18N_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error(
      'Set apps/web/scripts/i18n.config.json spreadsheetId or I18N_SPREADSHEET_ID before syncing i18n strings.',
    );
  }

  return spreadsheetId;
}

export function getSheetTitle() {
  const config = readConfig();

  return config?.sheetTitle ?? process.env.I18N_SHEET_TITLE;
}

export function toGeneratedResourceModule(resources) {
  const body = JSON.stringify(resources, null, 2);

  return [
    "import type { Resource } from 'i18next';",
    '',
    `export const generatedResources: Resource = ${body};`,
    '',
  ].join('\n');
}
