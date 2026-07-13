import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../api/products';
import Badge from './Badge';

interface AdminProductCardProps {
  product: Product;
  categoryName?: string;
  modelTypeName?: string;
  onUpdateStock: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export default function AdminProductCard({ product, categoryName, modelTypeName, onUpdateStock, onEdit, onDelete }: AdminProductCardProps) {
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
        <Text className="text-[#FF1F4B] font-extrabold text-base mb-1">₹{product.price}</Text>

        <View className="mb-2">
          {categoryName && (
            <Text className="text-xs text-slate-500 font-medium">Cat: <Text className="text-slate-700">{categoryName}</Text></Text>
          )}
          {modelTypeName && (
            <Text className="text-xs text-slate-500 font-medium">Type: <Text className="text-slate-700">{modelTypeName}</Text></Text>
          )}
          {product.has_variants && product.variants && product.variants.length > 0 && (
            <Text className="text-xs text-slate-500 font-medium mt-1">
              Sizes: <Text className="text-slate-700">{product.variants.map(v => v.size).join(', ')}</Text>
            </Text>
          )}
          {product.accepts_custom_size && (
            <Text className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">Custom Sizes</Text>
          )}
        </View>
        
        <View className="flex-row items-center mb-3">
          <Badge 
            label={isOutOfStock ? "Out of Stock" : isLowStock ? `Low (${product.quantity})` : `In Stock (${product.quantity})`}
            variant={isOutOfStock ? "danger" : isLowStock ? "warning" : "success"}
          />
        </View>
        
        <View className="flex-row items-center justify-between w-full">
          <TouchableOpacity 
            className="bg-slate-800 py-2.5 rounded-xl shadow-sm flex-row items-center justify-center flex-1 mr-2"
            onPress={() => onUpdateStock(product)}
            activeOpacity={0.8}
          >
            <Ionicons name="cube-outline" size={16} color="white" />
            <Text className="text-white font-bold ml-1 text-xs">Stock</Text>
          </TouchableOpacity>
          {onEdit && (
            <TouchableOpacity 
              className="bg-slate-100 py-2.5 rounded-xl border border-slate-200 flex-row items-center justify-center w-10 h-10 mr-2"
              onPress={() => onEdit(product)}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={16} color="#64748b" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity 
              className="bg-rose-50 py-2.5 rounded-xl border border-rose-100 flex-row items-center justify-center w-10 h-10"
              onPress={() => onDelete(product)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash" size={16} color="#F43F5E" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
