import { scanI18nDefaults } from './i18n-utils.mjs';

function parseArgs(argv) {
  const options = {
    json: false,
    scope: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--scope') {
      const scope = argv[index + 1];

      if (!scope) {
        throw new Error('Missing value for --scope.');
      }

      options.scope = scope;
      index += 1;
      continue;
    }

    throw new Error(`Unsupported i18n:scan option: ${arg}`);
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));
const entries = scanI18nDefaults({ scope: options.scope });

if (options.json) {
  console.log(JSON.stringify(entries, null, 2));
} else {
  console.log(`Found ${entries.length} i18n strings.`);
  for (const entry of entries) {
    console.log(`${entry.key} = ${entry.defaultValue}`);
  }
}
