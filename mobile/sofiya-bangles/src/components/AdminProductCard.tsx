import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../api/products';
import Badge from './Badge';

interface AdminProductCardProps {
  product: Product;
  onUpdateStock: (product: Product) => void;
  onEdit?: (product: Product) => void;
}

export default function AdminProductCard({ product, onUpdateStock, onEdit }: AdminProductCardProps) {
  const isOutOfStock = product.quantity <= 0;
  const isLowStock = product.quantity > 0 && product.quantity < 10;

  return (
    <View className="bg-white rounded-3xl p-3 mb-4 shadow-sm border border-slate-100 w-full">
      <View className="relative w-full aspect-square bg-slate-50 rounded-2xl mb-3">
        <Image 
          source={{ uri: product.image_url || 'https://images.unsplash.com/photo-1599643478524-fb66f453863a' }} 
          className="w-full h-full rounded-2xl"
          resizeMode="cover"
        />
        <View className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded-md">
          <Text className="text-white text-xs font-bold">{product.unique_code}</Text>
        </View>
      </View>
      
      <View className="flex-1">
        <Text className="font-bold text-slate-800 text-sm leading-tight mb-1" numberOfLines={2}>
          {product.product_name}
        </Text>
        <Text className="text-[#90132B] font-extrabold text-base mb-2">₹{product.price}</Text>
        
        <View className="flex-row items-center mb-3">
          <Badge 
            label={isOutOfStock ? "Out of Stock" : isLowStock ? `Low (${product.quantity})` : `In Stock (${product.quantity})`}
            variant={isOutOfStock ? "danger" : isLowStock ? "warning" : "success"}
          />
        </View>
        
        <TouchableOpacity 
          className="bg-slate-800 py-2.5 rounded-xl shadow-sm flex-row items-center justify-center w-full"
          onPress={() => onUpdateStock(product)}
          activeOpacity={0.8}
        >
          <Ionicons name="cube-outline" size={16} color="white" />
          <Text className="text-white font-bold ml-2 text-xs">Stock</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
