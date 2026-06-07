import type {
  CreateProductModifierRequest,
  LocalizedStringDto,
  ProductModifier,
  ProductModifierSelectionType,
} from '@/models/productModifier';
import { useFormState } from '@/shared/hooks/useFormState';

export type ProductModifierOptionFormValues = {
  id?: string;
  name: LocalizedStringDto;
  priceAdjustment: number;
  isDefault: boolean;
  isActive: boolean;
  isSoldOut: boolean;
};

export type ProductModifierFormValues = {
  name: LocalizedStringDto;
  selectionType: ProductModifierSelectionType;
  minSelect: number;
  maxSelect: number;
  options: ProductModifierOptionFormValues[];
  isActive: boolean;
};

function emptyOption(): ProductModifierOptionFormValues {
  return {
    name: {},
    priceAdjustment: 0,
    isDefault: false,
    isActive: true,
    isSoldOut: false,
  };
}

const initialValues: ProductModifierFormValues = {
  name: {},
  selectionType: 'single_choice',
  minSelect: 0,
  maxSelect: 1,
  options: [emptyOption()],
  isActive: true,
};

export function toProductModifierRequest(
  values: ProductModifierFormValues,
): CreateProductModifierRequest {
  return {
    name: values.name as CreateProductModifierRequest['name'],
    selectionType: values.selectionType,
    minSelect: values.minSelect,
    maxSelect: values.selectionType === 'single_choice' ? 1 : values.maxSelect,
    options: values.options.map((opt) => ({
      id: opt.id,
      name: opt.name as CreateProductModifierRequest['options'][number]['name'],
      priceAdjustment: opt.priceAdjustment,
      isDefault: opt.isDefault,
      isActive: opt.isActive,
      isSoldOut: opt.isSoldOut,
    })),
    isActive: values.isActive,
  };
}

export function valuesFromProductModifier(
  modifier: ProductModifier,
): ProductModifierFormValues {
  return {
    name: modifier.name,
    selectionType: modifier.selectionType,
    minSelect: modifier.minSelect,
    maxSelect: modifier.maxSelect,
    options: modifier.options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      priceAdjustment: opt.priceAdjustment,
      isDefault: opt.isDefault,
      isActive: opt.isActive,
      isSoldOut: opt.isSoldOut,
    })),
    isActive: modifier.isActive,
  };
}

export function useProductModifierForm(
  initial: ProductModifierFormValues = initialValues,
) {
  const state = useFormState<ProductModifierFormValues>(initial);

  return {
    ...state,

    addOption() {
      state.setField('options', [...state.values.options, emptyOption()]);
    },

    removeOption(index: number) {
      state.setField(
        'options',
        state.values.options.filter((_, i) => i !== index),
      );
    },

    setOptionField<K extends keyof ProductModifierOptionFormValues>(
      index: number,
      field: K,
      value: ProductModifierOptionFormValues[K],
    ) {
      state.setField(
        'options',
        state.values.options.map((opt, i) =>
          i === index ? { ...opt, [field]: value } : opt,
        ),
      );
    },
  };
}

export type ProductModifierForm = ReturnType<typeof useProductModifierForm>;
