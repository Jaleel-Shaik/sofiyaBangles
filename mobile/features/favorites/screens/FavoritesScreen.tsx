import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getFavorites, Favorite } from '@/src/api/favorites';
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
      getFavorites(),
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

  const openWhatsApp = async (product?: any) => {
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
      <View className="bg-surface border-b border-divider">
        <Header
          title="Favorites"
          subtitle={`${favorites.length} items saved`}
          transparent
          titleClassName="text-2xl font-bold text-text-primary"
        />
      </View>

      {availableCategories.length > 0 && (
        <View className="px-5 py-3 bg-surface border-b border-divider">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FilterPill
              label="All"
              isActive={activeFilter === 'All'}
              onPress={() => setActiveFilter('All')}
            />
            {availableCategories.map((cat) => (
              <FilterPill
                key={cat.id}
                label={cat.category_name}
                isActive={activeFilter === cat.id}
                onPress={() => setActiveFilter(cat.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
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
            <FavoriteItemCard
              key={fav.id}
              product={fav.product}
              onRemove={() => handleRemove(fav.product_id)}
              onWhatsApp={() => openWhatsApp(fav.product)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
