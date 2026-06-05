import { tDefault } from '@/app/i18n';

export type ProductModifierCommandFieldErrors = Partial<
  Record<'name' | 'options' | 'minSelect', string>
>;

export function mapProductModifierFieldErrors(
  issues: Array<{ path: PropertyKey[] }>,
): ProductModifierCommandFieldErrors {
  const errors: ProductModifierCommandFieldErrors = {};

  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');

    if (field === 'name') {
      errors.name = tDefault(
        'merchant.productModifiers.validation.invalid',
        'This field is invalid.',
      );
    } else if (field === 'options') {
      errors.options = tDefault(
        'merchant.productModifiers.validation.optionsInvalid',
        'One or more options are invalid.',
      );
    } else if (field === 'minSelect' || field === 'maxSelect' || field === '') {
      errors.minSelect = tDefault(
        'merchant.productModifiers.validation.selectionBoundsInvalid',
        'Selection bounds are invalid.',
      );
    }
  }

  return errors;
}
