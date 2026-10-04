

interface ProductVariantSelectorProps {
  product: any;
  productModelTypeName?: string;
  selectedVariantId: string | null;
  setSelectedVariantId: (id: string | null) => void;
  useCustomSize: boolean;
  setUseCustomSize: (val: boolean) => void;
  onSelectVariant?: (id: string | null) => void;
}

export function ProductVariantSelector(_props: ProductVariantSelectorProps) {
  return null;
}
