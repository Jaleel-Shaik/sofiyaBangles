import type { Product } from '@/src/api/products';
import { api } from "@/src/api";
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Badge from './Badge';
import { IMAGE_SIZES } from '../utils/screen';

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
    <View className="bg-surface rounded-2xl p-4 mb-4 border border-divider w-full">
      <View className={`relative w-full ${IMAGE_SIZES.admin.cardImage} bg-[#FAFAFA] rounded-xl mb-3 overflow-hidden`}>
        <Image
          source={{ uri: product.image_url || 'https://images.unsplash.com/photo-1599643478524-fb66f453863a' }}
          className="w-full h-full"
          resizeMode="cover"
        />
        <View className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded-md">
          <Text className="text-white text-xs font-bold">{product.unique_code}</Text>
        </View>
      </View>

      <View className="flex-1">
        <Text className="font-bold text-text-primary text-sm leading-tight mb-1" numberOfLines={2}>
          {product.product_name}
        </Text>
        <Text className="text-[#C25B3E] font-extrabold text-base mb-1">₹{product.price}</Text>

        <View className="mb-2">
          {categoryName && (
            <Text className="text-xs text-text-secondary font-medium">Cat: <Text className="text-text-primary">{categoryName}</Text></Text>
          )}
          {modelTypeName && (
            <Text className="text-xs text-text-secondary font-medium">Type: <Text className="text-text-primary">{modelTypeName}</Text></Text>
          )}
          {product.has_variants && product.variants && product.variants.length > 0 && (
            <Text className="text-xs text-text-secondary font-medium mt-1">
              Sizes: <Text className="text-text-primary">{product.variants.map(v => v.size).join(', ')}</Text>
            </Text>
          )}
          {product.accepts_custom_size && (
            <Text className="text-[10px] text-primary font-bold mt-1 uppercase tracking-tighter">Custom Sizes</Text>
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
            className="bg-[#111827] py-2.5 rounded-xl flex-row items-center justify-center flex-1 mr-2"
            onPress={() => onUpdateStock(product)}
            activeOpacity={0.8}
          >
            <Ionicons name="cube-outline" size={16} color="white" />
            <Text className="text-white font-bold ml-1 text-xs">Stock</Text>
          </TouchableOpacity>
          {onEdit && (
            <TouchableOpacity
              className="bg-slate-100 py-2.5 rounded-xl border border-divider items-center justify-center w-10 h-10 mr-2"
              onPress={() => onEdit(product)}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={16} color="#64748b" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              className="bg-primary/10 py-2.5 rounded-xl border border-primary/20 items-center justify-center w-10 h-10"
              onPress={() => onDelete(product)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash" size={16} color="#e11d48" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
