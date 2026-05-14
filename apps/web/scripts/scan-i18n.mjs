import { scanI18nDefaults } from './i18n-utils.mjs';

const entries = scanI18nDefaults();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(entries, null, 2));
} else {
  console.log(`Found ${entries.length} i18n strings.`);
  for (const entry of entries) {
    console.log(`${entry.key} = ${entry.defaultValue}`);
  }
}
