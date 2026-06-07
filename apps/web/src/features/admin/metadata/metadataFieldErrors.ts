import { tDefault } from '@/app/i18n';

export function metadataFieldErrorForPath(path: string): string {
  if (path === 'key') {
    return tDefault(
      'admin.metadata.validation.key',
      'Use lowercase letters, numbers, hyphens, or underscores.',
    );
  }

  if (path === 'name.zh-TW') {
    return tDefault(
      'admin.metadata.validation.zhTwRequired',
      'Chinese name is required.',
    );
  }

  return tDefault('admin.validation.invalidField', 'This field is invalid.');
}

export function mapMetadataFieldErrors<T extends object>(
  issues: Array<{ path: PropertyKey[] }>,
): T {
  return Object.fromEntries(
    issues.map((issue) => {
      const path = issue.path.map(String).join('.');
      const field = path.startsWith('name') ? 'name' : String(issue.path[0]);

      return [field, metadataFieldErrorForPath(path)];
    }),
  ) as T;
}
