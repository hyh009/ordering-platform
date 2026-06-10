import { tDefault } from '@/app/i18n';

export type ProductCommandFieldErrors = Partial<
  Record<'name' | 'price' | 'imageUrl', string>
>;

export function mapProductFieldErrors(
  issues: Array<{ path: PropertyKey[] }>,
): ProductCommandFieldErrors {
  const errors: ProductCommandFieldErrors = {};

  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');

    if (field === 'name') {
      errors.name = tDefault(
        'merchant.products.validation.nameInvalid',
        'Enter a product name in at least one language.',
      );
    } else if (field === 'price') {
      errors.price = tDefault(
        'merchant.products.validation.priceInvalid',
        'Enter a valid price.',
      );
    } else if (field === 'imageUrls') {
      errors.imageUrl = tDefault(
        'merchant.products.validation.imageInvalid',
        'Enter a valid image URL.',
      );
    }
  }

  return errors;
}
