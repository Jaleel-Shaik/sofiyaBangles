import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Product } from '@/src/api/products';
import { AppIcon } from '../constants/icons';
import { STRINGS } from '../constants/strings';

interface FavoriteItemCardProps {
  product: Product;
  onRemove: () => void;
  onWhatsApp: () => void;
}

export default function FavoriteItemCard({ product, onRemove, onWhatsApp }: FavoriteItemCardProps) {
  return (
    <View className="bg-surface rounded-2xl mb-4 border border-divider shadow-sm overflow-hidden">
      <View className="flex-row p-3.5">
        <View className="w-32 h-32 rounded-xl bg-surface-secondary overflow-hidden mr-3.5 border border-divider">
          <Image
            source={{ uri: product?.image_url || 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a' }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
        <View className="flex-1 justify-between py-0.5">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-2">
              <Text className="font-semibold text-text-primary text-title-sm leading-snug" numberOfLines={2}>
                {product?.product_name || 'Bridal Gold Bangle Set'}
              </Text>
              <Text className="text-[#C25B3E] font-bold text-title-md mt-1">₹{product?.price || '1,299'}</Text>
            </View>
            <TouchableOpacity
              onPress={onRemove}
              className="w-11 h-11 bg-rose-50 rounded-full items-center justify-center border border-rose-100"
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.favorites.removeAccessibility}
            >
              <AppIcon name="heart" size={18} color="#e11d48" />
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center justify-between mt-2">
            {product?.quantity > 0 ? (
              <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Text className="text-emerald-700 text-label-sm font-semibold">{STRINGS.common.inStock}</Text>
              </View>
            ) : (
              <View className="bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                <Text className="text-rose-700 text-label-sm font-semibold">{STRINGS.common.soldOut}</Text>
              </View>
            )}
            <TouchableOpacity
              className="bg-[#25D366] flex-row items-center min-h-[44px] py-2 px-3.5 rounded-full shadow-xs"
              onPress={onWhatsApp}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.productDetail.inquireWhatsApp}
            >
              <AppIcon name="whatsapp" size={16} color="white" family="fontawesome" />
              <Text className="text-white font-bold text-label-sm ml-1.5">{STRINGS.common.whatsApp}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
