import type { Product } from '@/src/api/products';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { useFavoriteStore } from '../store/favoriteStore';
import { AppIcon } from '../constants/icons';
import { STRINGS } from '../constants/strings';

interface ProductCardProps {
  product: Product;
  isFavorite?: boolean;
  isPurchased?: boolean;
  onToggleFavorite?: () => void;
}

export default function ProductCard({
  product,
  isFavorite: propIsFavorite,
  isPurchased = false,
  onToggleFavorite,
}: ProductCardProps) {
  const router = useRouter();
  const { favoriteIds, toggleFavorite } = useFavoriteStore();

  if (!product || !product.id) return null;

  const safeFavIds = Array.isArray(favoriteIds) ? favoriteIds : [];
  const isFavorite = safeFavIds.includes(product.id) || propIsFavorite;
  const productName = product.product_name || 'Bangle';
  const uniqueCode = product.unique_code?.trim() || '';
  const modelTypeName = product.model_type_name?.trim() || '';
  const price = typeof product.price === 'number' ? product.price : Number(product.price) || 0;
  const quantity = typeof product.quantity === 'number' ? product.quantity : Number(product.quantity) || 0;

  const isOutOfStock = quantity <= 0;
  const isLowStock = quantity > 0 && quantity <= 5;

  const sizesList = (product.variants || [])
    .map((v) => v?.size?.trim())
    .filter((s): s is string => Boolean(s && s.length > 0));
  const uniqueSizes = Array.from(new Set(sizesList));

  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl mb-4 border border-divider overflow-hidden shadow-xs"
      style={{ width: '48%' }}
      onPress={() =>
        router.push({
          pathname: '/products/[id]',
          params: { id: product.id },
        })
      }
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`View ${productName}, Code: ${uniqueCode || 'N/A'}, Price: ₹${price}, Stock: ${isOutOfStock ? 'Out of Stock' : `${quantity} in stock`}`}
    >
      {/* Product Image & Badges */}
      <View className="w-full aspect-[4/5] bg-surface-secondary relative overflow-hidden">
        <Image
          source={{
            uri:
              product.image_url ||
              'https://images.unsplash.com/photo-1599643478524-fb66f453863a',
          }}
          className="w-full h-full"
          resizeMode="cover"
        />

        {/* Top-Left Badges: Code & Bought */}
        <View className="absolute top-2 left-2 z-10 gap-1 items-start max-w-[70%]">
          {uniqueCode ? (
            <View className="bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20 flex-row items-center shadow-xs">
              <Text className="text-white/70 text-[9px] font-bold uppercase tracking-wider mr-1">
                {STRINGS.common.code}:
              </Text>
              <Text className="text-white text-[10px] font-extrabold tracking-wide" numberOfLines={1}>
                {uniqueCode}
              </Text>
            </View>
          ) : null}

          {isPurchased && (
            <View className="bg-emerald-600 px-2 py-0.5 rounded-md shadow-xs flex-row items-center">
              <AppIcon name="check" size={10} color="#FFFFFF" />
              <Text className="text-white text-[9px] font-bold tracking-wider ml-1 uppercase">
                {STRINGS.common.bought}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom-Left Type Badge */}
        {modelTypeName ? (
          <View className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-black/5 flex-row items-center shadow-xs max-w-[80%]">
            <Text className="text-slate-500 text-[9px] font-bold uppercase mr-1">
              {STRINGS.common.type}:
            </Text>
            <Text className="text-slate-900 text-[9px] font-bold" numberOfLines={1}>
              {modelTypeName}
            </Text>
          </View>
        ) : null}

        {/* Top-Right Favorite Button */}
        <TouchableOpacity
          className="absolute top-1.5 right-1.5 w-11 h-11 rounded-full bg-white/95 items-center justify-center shadow-xs border border-black/5"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite
              ? `${STRINGS.favorites.removeAccessibility} ${product.product_name}`
              : `${STRINGS.favorites.addAccessibility} ${product.product_name}`
          }
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
            if (onToggleFavorite) onToggleFavorite();
          }}
        >
          <AppIcon
            name={isFavorite ? 'heart' : 'heartOutline'}
            size={20}
            color={isFavorite ? '#e11d48' : '#64748b'}
          />
        </TouchableOpacity>
      </View>

      {/* Labeled Product Details */}
      <View className="p-3 bg-white">
        {/* Design Name Row */}
        <View className="mb-1">
          <Text className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
            {STRINGS.common.design}
          </Text>
          <Text
            className="font-bold text-text-primary text-[14px] leading-tight mt-0.5"
            numberOfLines={1}
          >
            {productName}
          </Text>
        </View>

        {/* Price Row */}
        <View className="flex-row items-baseline mt-1">
          <Text className="text-[11px] font-semibold text-text-secondary mr-1">
            {STRINGS.common.price}:
          </Text>
          <Text className="text-[#C25B3E] font-black text-[16px] leading-none">
            ₹{price}
          </Text>
        </View>

        {/* Stock Row */}
        <View className="flex-row items-center mt-2 flex-wrap">
          <Text className="text-[10px] font-semibold text-text-secondary mr-1">
            {STRINGS.common.stock}:
          </Text>
          {isOutOfStock ? (
            <View className="bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
              <Text className="text-rose-600 text-[10px] font-bold">
                {STRINGS.common.outOfStock}
              </Text>
            </View>
          ) : isLowStock ? (
            <View className="bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
              <Text className="text-amber-700 text-[10px] font-bold">
                {STRINGS.common.lowStock(quantity)}
              </Text>
            </View>
          ) : (
            <View className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              <Text className="text-emerald-700 text-[10px] font-bold">
                {STRINGS.common.inStock} ({quantity})
              </Text>
            </View>
          )}
        </View>

        {/* Sizes Row (if available or accepts custom size) */}
        {(uniqueSizes.length > 0 || product.accepts_custom_size) && (
          <View className="flex-row items-center mt-2 pt-1.5 border-t border-slate-100 flex-wrap">
            <Text className="text-[10px] font-semibold text-text-secondary mr-1">
              {STRINGS.common.sizes}:
            </Text>
            <Text className="text-[10px] font-medium text-slate-800 flex-1" numberOfLines={1}>
              {uniqueSizes.length > 0 ? uniqueSizes.join(', ') : ''}
              {product.accepts_custom_size
                ? uniqueSizes.length > 0
                  ? ' + Custom'
                  : 'Custom Tailored'
                : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
