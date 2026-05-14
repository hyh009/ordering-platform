export const defaultLanguage = 'en';

export const supportedLanguages = ['en', 'zh-TW'] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageStorageKey = 'react-express-starter.language';

export const languageOptions: Array<{
  label: string;
  value: SupportedLanguage;
}> = [
  {
    label: 'English',
    value: 'en',
  },
  {
    label: '繁體中文',
    value: 'zh-TW',
  },
];

export function isSupportedLanguage(
  language: string,
): language is SupportedLanguage {
  return supportedLanguages.includes(language as SupportedLanguage);
}
