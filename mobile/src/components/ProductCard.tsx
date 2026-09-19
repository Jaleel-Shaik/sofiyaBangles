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
  const price = typeof product.price === 'number' ? product.price : Number(product.price) || 0;
  const quantity = typeof product.quantity === 'number' ? product.quantity : Number(product.quantity) || 0;

  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl mb-4 border border-divider overflow-hidden shadow-sm"
      style={{ width: '48%' }}
      onPress={() =>
        router.push({
          pathname: '/products/[id]',
          params: { id: product.id },
        })
      }
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`View ${productName}, price ₹${price}`}
    >
      <View className="w-full aspect-[4/5] bg-surface-secondary relative">
        <Image
          source={{
            uri:
              product.image_url ||
              'https://images.unsplash.com/photo-1599643478524-fb66f453863a',
          }}
          className="w-full h-full"
          resizeMode="cover"
        />
        {isPurchased && (
          <View className="absolute top-2.5 left-2.5 bg-emerald-600 px-2.5 py-1 rounded-full shadow-sm">
            <Text className="text-white text-overline font-bold tracking-wider">{STRINGS.common.bought}</Text>
          </View>
        )}
        <TouchableOpacity
          className="absolute top-1.5 right-1.5 w-11 h-11 rounded-full bg-white/95 items-center justify-center shadow-sm border border-black/5"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? `${STRINGS.favorites.removeAccessibility} ${product.product_name}` : `${STRINGS.favorites.addAccessibility} ${product.product_name}`}
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

      <View className="p-3.5">
        <Text
          className="font-semibold text-text-primary text-title-sm leading-snug"
          numberOfLines={1}
        >
          {productName}
        </Text>
        <Text className="text-[#C25B3E] font-bold text-title-md mt-1">
          ₹{price}
        </Text>
        {quantity <= 0 && (
          <View className="bg-rose-600 px-2 py-0.5 rounded-full mt-1.5 self-start">
            <Text className="text-white text-overline font-bold">{STRINGS.common.soldOut}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
