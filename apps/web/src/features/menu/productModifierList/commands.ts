import { tDefault } from '@/app/i18n';
import {
  createProductModifierSchema,
  updateProductModifierSchema,
} from '@/models/productModifier';
import type {
  CreateProductModifierRequest,
  ProductModifier,
  ProductModifierActiveFilter,
  UpdateProductModifierRequest,
} from '@/models/productModifier';
import { productModifierService } from '@/services/productModifier.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { ProductModifierListActions } from './actions';

export type ProductModifierCommandFieldErrors = Partial<
  Record<'name' | 'options' | 'minSelect', string>
>;

export type LoadProductModifiersResult =
  | { status: 'loaded' }
  | MerchantCommandFailure;

export type SaveProductModifierResult =
  | { modifier: ProductModifier; status: 'saved' }
  | (MerchantCommandFailure & { fieldErrors?: ProductModifierCommandFieldErrors });

function mapProductModifierFieldErrors(
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

export type ProductModifierListCommands = {
  loadProductModifiers(
    storeId: string,
    isActive: ProductModifierActiveFilter,
  ): Promise<LoadProductModifiersResult>;
  createProductModifier(
    storeId: string,
    input: CreateProductModifierRequest,
  ): Promise<SaveProductModifierResult>;
  updateProductModifier(
    storeId: string,
    productModifierId: string,
    input: UpdateProductModifierRequest,
  ): Promise<SaveProductModifierResult>;
};

type Schema = {
  safeParse(input: unknown):
    | { success: true }
    | { success: false; error: { issues: Array<{ path: PropertyKey[] }> } };
};

async function runSave(
  schema: Schema,
  input: unknown,
  actions: ProductModifierListActions,
  serviceCall: () => Promise<ProductModifier>,
): Promise<SaveProductModifierResult> {
  const validation = schema.safeParse(input);

  if (!validation.success) {
    return {
      fieldErrors: mapProductModifierFieldErrors(validation.error.issues),
      message: tDefault(
        'merchant.errors.validation',
        'Check the highlighted fields and try again.',
      ),
      reason: 'invalid',
      status: 'failed',
    };
  }

  try {
    const modifier = await serviceCall();

    actions.modifierSaved(modifier);
    return { modifier, status: 'saved' };
  } catch (error) {
    return mapMerchantApiError(error);
  }
}

export function createProductModifierListCommands(
  actions: ProductModifierListActions,
): ProductModifierListCommands {
  return {
    async loadProductModifiers(storeId, isActive) {
      actions.loadStarted();

      try {
        const productModifiers = await productModifierService.listProductModifiers(
          storeId,
          isActive,
        );

        actions.loadSucceeded(productModifiers);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },

    createProductModifier(storeId, input) {
      return runSave(createProductModifierSchema, input, actions, () =>
        productModifierService.createProductModifier(storeId, input),
      );
    },

    updateProductModifier(storeId, productModifierId, input) {
      return runSave(updateProductModifierSchema, input, actions, () =>
        productModifierService.updateProductModifier(storeId, productModifierId, input),
      );
    },
  };
}
