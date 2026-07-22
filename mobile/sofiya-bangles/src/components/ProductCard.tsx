import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Product } from '../api/products';
import { useFavoriteStore } from '../store/favoriteStore';
import { useSizeStore } from '../store/sizeStore';
import Badge from './Badge';

interface ProductCardProps {
  product: Product;
  categoryId?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function ProductCard({ product, categoryId, isFavorite: propIsFavorite, onToggleFavorite }: ProductCardProps) {
  const router = useRouter();
  const { favoriteIds, toggleFavorite } = useFavoriteStore();
  const { preferences } = useSizeStore();
  
  // Use global state if available, fallback to prop for isolated components
  const isFavorite = favoriteIds.includes(product.id) || propIsFavorite;
  
  const isPerfectFit = categoryId 
    ? preferences.some(p => p.category_id === categoryId) 
    : false;

  return (
    <TouchableOpacity 
      className="bg-white rounded-3xl p-4 mb-4 shadow-sm border border-slate-100"
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
            toggleFavorite(product.id);
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
        <View className="flex-row justify-between items-center mt-2">
          <Text className="text-[#C25B3E] font-extrabold text-lg">₹{product.price}</Text>
        </View>

        {/* Display Sizes if available */}
        {(product.has_variants && product.variants && product.variants.length > 0) && (
          <Text className="text-[10px] text-slate-500 font-medium mt-1 uppercase" numberOfLines={1}>
            Sizes: {product.variants.map(v => v.size).join(', ')}
          </Text>
        )}
        {product.accepts_custom_size && (
          <Text className="text-[10px] text-rose-500 font-bold mt-1 uppercase">Custom Sizes</Text>
        )}
        <View className="flex-row items-center mt-2 flex-wrap gap-2">
          {isPerfectFit && (
            <View className="bg-rose-100 px-2 py-1 rounded-md flex-row items-center">
              <Ionicons name="sparkles" size={10} color="#FF1F4B" className="mr-1" />
              <Text className="text-[#FF1F4B] text-[10px] font-bold uppercase tracking-widest">Perfect Fit</Text>
            </View>
          )}
          <Badge 
            label={product.quantity > 0 ? "In Stock" : "Sold Out"}
            variant={product.quantity > 0 ? "success" : "danger"}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
