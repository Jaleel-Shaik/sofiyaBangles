import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { Product } from '@/src/api/products';

interface FavoriteItemCardProps {
  product: Product;
  onRemove: () => void;
  onWhatsApp: () => void;
}

export default function FavoriteItemCard({ product, onRemove, onWhatsApp }: FavoriteItemCardProps) {
  return (
    <View className="bg-surface rounded-2xl mb-4 border border-divider overflow-hidden">
      <View className="flex-row p-3">
        <View className="w-36 h-36 rounded-xl bg-[#FAFAFA] overflow-hidden mr-3">
          <Image
            source={{ uri: product?.image_url || 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a' }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
        <View className="flex-1 justify-between py-0.5">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-2">
              <Text className="font-bold text-text-primary text-sm leading-5" numberOfLines={2}>
                {product?.product_name || 'Bridal Gold Bangle Set'}
              </Text>
              <Text className="text-[#C25B3E] font-extrabold text-lg mt-1">₹{product?.price || '1,299'}</Text>
            </View>
            <TouchableOpacity onPress={onRemove} className="p-2 bg-primary/10 rounded-full">
              <Ionicons name="heart" size={16} color="#e11d48" />
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center justify-between">
            {product?.quantity > 0 ? (
              <Text className="text-success text-xs font-bold">In Stock</Text>
            ) : (
              <Text className="text-error text-xs font-bold">Sold Out</Text>
            )}
            <TouchableOpacity
              className="bg-[#00D166] flex-row items-center py-2 px-3 rounded-full"
              onPress={onWhatsApp}
            >
              <FontAwesome name="whatsapp" size={13} color="white" />
              <Text className="text-white font-bold text-xs ml-1.5">WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
