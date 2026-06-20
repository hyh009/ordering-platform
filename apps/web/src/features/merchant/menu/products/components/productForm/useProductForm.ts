import { useEffect, useMemo, useState } from 'react';
import { useFormState } from '@/shared/hooks/useFormState';
import type {
  CreateProductRequest,
  LocalizedStringDto,
  Product,
  ProductStatus,
  UpdateProductRequest,
} from '@/models/product';

export type ProductFormValues = {
  name: LocalizedStringDto;
  description: LocalizedStringDto;
  price: number;
  // The backend stores imageUrls: string[], but the merchant UI authors a
  // single image for now (Phase 6). We bind imageUrls[0] here and expand back
  // to an array on submit. Gallery/upload is deferred to Phase 7.
  imageUrl: string;
  categoryIds: string[];
  tagIds: string[];
  allergenIds: string[];
  dietaryMarkerIds: string[];
  modifierIds: string[];
  isActive: boolean;
};

const initialValues: ProductFormValues = {
  name: {},
  description: {},
  price: 0,
  imageUrl: '',
  categoryIds: [],
  tagIds: [],
  allergenIds: [],
  dietaryMarkerIds: [],
  modifierIds: [],
  isActive: true,
};

function hasLocalizedContent(value: LocalizedStringDto): boolean {
  return Boolean(value.en?.trim() ?? value['zh-TW']?.trim());
}

function imageUrlsFromValue(imageUrl: string): string[] {
  const trimmed = imageUrl.trim();
  return trimmed ? [trimmed] : [];
}

export function toCreateProductRequest(
  values: ProductFormValues,
  status: ProductStatus,
): CreateProductRequest {
  return {
    name: values.name as CreateProductRequest['name'],
    ...(hasLocalizedContent(values.description) && {
      description: values.description,
    }),
    price: values.price,
    imageUrls: imageUrlsFromValue(values.imageUrl),
    categoryIds: values.categoryIds,
    tagIds: values.tagIds,
    allergenIds: values.allergenIds,
    dietaryMarkerIds: values.dietaryMarkerIds,
    modifierIds: values.modifierIds,
    status,
    isActive: values.isActive,
  };
}

export function toUpdateProductRequest(
  values: ProductFormValues,
  status: ProductStatus,
): UpdateProductRequest {
  return {
    name: values.name as UpdateProductRequest['name'],
    description: hasLocalizedContent(values.description)
      ? values.description
      : {},
    price: values.price,
    imageUrls: imageUrlsFromValue(values.imageUrl),
    categoryIds: values.categoryIds,
    tagIds: values.tagIds,
    allergenIds: values.allergenIds,
    dietaryMarkerIds: values.dietaryMarkerIds,
    modifierIds: values.modifierIds,
    status,
    isActive: values.isActive,
  };
}

export function valuesFromProduct(product: Product): ProductFormValues {
  return {
    name: product.name,
    description: product.description ?? {},
    price: product.price,
    imageUrl: product.imageUrls[0] ?? '',
    categoryIds: product.categoryIds,
    tagIds: product.tagIds,
    allergenIds: product.allergenIds,
    dietaryMarkerIds: product.dietaryMarkerIds,
    modifierIds: product.modifierIds,
    isActive: product.isActive,
  };
}

type BaseProductForm = ReturnType<typeof useFormState<ProductFormValues>>;

export type ProductForm = BaseProductForm & {
  pendingImageFile: File | null;
  imagePreviewUrl: string;
  setPendingImageFile: (file: File) => void;
  removeProductImage: () => void;
};

export function useProductForm(): ProductForm {
  const formState = useFormState<ProductFormValues>(initialValues);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  const previewObjectUrl = useMemo(
    () => (pendingImageFile ? URL.createObjectURL(pendingImageFile) : null),
    [pendingImageFile],
  );

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  const imagePreviewUrl = previewObjectUrl ?? formState.values.imageUrl;

  const removeProductImage = () => {
    setPendingImageFile(null);
    formState.setField('imageUrl', '');
  };

  // Override reset to also clear the pending file
  const originalReset = formState.reset;
  const reset = (nextValues?: ProductFormValues) => {
    originalReset(nextValues);
    setPendingImageFile(null);
  };

  return {
    ...formState,
    reset,
    pendingImageFile,
    imagePreviewUrl,
    setPendingImageFile,
    removeProductImage,
  };
}
