import type { Favorite } from '@/src/api/favorites';
import type { Product } from '@/src/api/products';
import { api } from "@/src/api";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getCategories, Category } from '@/src/api/categories';
import { useFavoriteStore } from '@/src/store/favoriteStore';
import Header from '@/src/components/Header';
import FilterPill from '@/src/components/FilterPill';
import FavoriteItemCard from '@/src/components/FavoriteItemCard';
import { openWhatsAppEnquiry } from '@/src/utils/whatsapp';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const { toggleFavorite } = useFavoriteStore();

  const fetchFavoritesAndCats = async () => {
    const [favData, catData] = await Promise.all([
      api.favorites.getFavorites(),
      getCategories()
    ]);
    setFavorites(favData);
    setCategories(catData);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavoritesAndCats();
    }, [])
  );

  const handleRemove = async (productId: string) => {
    try {
      await toggleFavorite(productId);
      setFavorites(favorites.filter(f => f.product_id !== productId));
    } catch (error) {
      console.error(error);
    }
  };

  const openWhatsApp = async (product?: Product) => {
    if (!product) return;
    await openWhatsAppEnquiry({
      productId: product.id,
      productName: product.product_name,
      description: product.description,
      categoryId: product.unique_code || product.category_id,
      cost: product.price,
      uniqueCode: product.unique_code,
    });
  };

  const favCategoryIds = new Set(favorites.map(f => f.product?.category_id).filter(Boolean));
  const availableCategories = categories.filter(c => favCategoryIds.has(c.id));

  const filteredFavorites = activeFilter === 'All'
    ? favorites
    : favorites.filter(f => f.product?.category_id === activeFilter);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <Header title="My Favorites" showBack={false} />

      {/* Category Pills */}
      {availableCategories.length > 0 && (
        <View className="py-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            className="flex-row"
          >
            <FilterPill
              label="All"
              isActive={activeFilter === 'All'}
              onPress={() => setActiveFilter('All')}
            />
            {availableCategories.map((cat) => (
              <FilterPill
                key={cat.id}
                label={cat.name || cat.category_name}
                isActive={activeFilter === cat.id}
                onPress={() => setActiveFilter(cat.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* List */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredFavorites.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons name="heart-outline" size={32} color="#e11d48" />
            </View>
            <Text className="text-lg font-bold text-text-primary mb-1">No favorites yet</Text>
            <Text className="text-text-secondary text-sm text-center px-8">
              Tap the heart icon on any bangle to save it here
            </Text>
          </View>
        ) : (
          filteredFavorites.map((fav) => (
            fav.product ? (
              <FavoriteItemCard
                key={fav.id}
                product={fav.product}
                onRemove={() => handleRemove(fav.product_id)}
                onWhatsApp={() => openWhatsApp(fav.product)}
              />
            ) : null
          ))
        )}
      </ScrollView>
    </View>
  );
}
