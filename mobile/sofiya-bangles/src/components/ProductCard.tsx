import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Product } from '../api/products';
import Badge from './Badge';

interface ProductCardProps {
  product: Product;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function ProductCard({ product, isFavorite, onToggleFavorite }: ProductCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity 
      className="bg-white rounded-3xl p-4 mb-5 shadow-sm border border-slate-100"
      style={{ width: '48%' }}
      onPress={() => router.push({ pathname: '/products/[id]', params: { id: product.id } } as any)}
      activeOpacity={0.8}
    >
      <View className="relative w-full aspect-square bg-slate-50 rounded-2xl">
        <Image 
          source={{ uri: product.image_url || 'https://images.unsplash.com/photo-1599643478524-fb66f453863a' }} 
          className="w-full h-full rounded-2xl"
          resizeMode="cover"
        />
        <TouchableOpacity 
          className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md"
          onPress={(e) => {
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite();
          }}
        >
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={20} 
            color={isFavorite ? "#FF1F4B" : "#94a3b8"} 
          />
        </TouchableOpacity>
      </View>
      
      <View className="mt-4">
        <Text className="font-bold text-slate-800 text-base leading-5" numberOfLines={2}>
          {product.product_name}
        </Text>
        <View className="flex-row justify-between items-center mt-3">
          <Text className="text-[#C25B3E] font-extrabold text-lg">₹{product.price}</Text>
        </View>
        <View className="mt-2 self-start">
          <Badge 
            label={product.quantity > 0 ? "In Stock" : "Sold Out"}
            variant={product.quantity > 0 ? "success" : "danger"}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
