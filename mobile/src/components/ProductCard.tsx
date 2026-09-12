import type { Product } from '@/src/api/products';
import { api } from "@/src/api";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useFavoriteStore } from "../store/favoriteStore";

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
  const isFavorite = favoriteIds.includes(product.id) || propIsFavorite;

  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl mb-4 border border-divider overflow-hidden"
      style={{ width: "48%" }}
      onPress={() =>
        router.push({
          pathname: "/products/[id]",
          params: { id: product.id },
        } as any)
      }
      activeOpacity={0.9}
    >
      <View className="w-full aspect-[4/5] bg-[#FAFAFA]">
        <Image
          source={{
            uri:
              product.image_url ||
              "https://images.unsplash.com/photo-1599643478524-fb66f453863a",
          }}
          className="w-full h-full"
          resizeMode="cover"
        />
        {isPurchased && (
          <View className="absolute top-2 left-2 bg-success px-2 py-1 rounded-md">
            <Text className="text-white text-[10px] font-bold uppercase">Bought</Text>
          </View>
        )}
        <TouchableOpacity
          className="absolute top-2 right-2 bg-white/90 rounded-full p-2 shadow-sm"
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
            if (onToggleFavorite) onToggleFavorite();
          }}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={18}
            color={isFavorite ? "#e11d48" : "#94a3b8"}
          />
        </TouchableOpacity>
      </View>

      <View className="p-3">
        <Text
          className="font-bold text-text-primary text-sm leading-5"
          numberOfLines={1}
        >
          {product.product_name}
        </Text>
        <Text className="text-[#C25B3E] font-extrabold text-lg mt-1">
          ₹{product.price}
        </Text>
        {product.quantity <= 0 && (
          <View className="bg-error px-2 py-0.5 rounded mt-1 self-start">
            <Text className="text-white text-[10px] font-bold">Sold Out</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
