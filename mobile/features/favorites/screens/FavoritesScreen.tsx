import type { Favorite } from '@/src/api/favorites';
import type { Product } from '@/src/api/products';
import { api } from "@/src/api";
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { getCategories, Category } from '@/src/api/categories';
import { useFavoriteStore } from '@/src/store/favoriteStore';
import { useAuthStore } from '@/src/store/authStore';
import Header from '@/src/components/Header';
import FilterPill from '@/src/components/FilterPill';
import FavoriteItemCard from '@/src/components/FavoriteItemCard';
import { openWhatsAppEnquiry } from '@/src/utils/whatsapp';
import { AppIcon } from '@/src/constants/icons';
import { STRINGS } from '@/src/constants/strings';

export default function FavoritesScreen() {
  const { token } = useAuthStore();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const { toggleFavorite } = useFavoriteStore();

  const fetchFavoritesAndCats = async () => {
    setLoading(true);
    try {
      if (!token) {
        setFavorites([]);
        const catData = await getCategories();
        setCategories(Array.isArray(catData) ? catData : []);
      } else {
        const [favResult, catResult] = await Promise.allSettled([
          api.favorites.getFavorites(),
          getCategories()
        ]);
        if (favResult.status === 'fulfilled') {
          setFavorites(Array.isArray(favResult.value) ? favResult.value : []);
        } else {
          console.warn("Failed to fetch favorites:", favResult.reason);
          setFavorites([]);
        }
        if (catResult.status === 'fulfilled') {
          setCategories(Array.isArray(catResult.value) ? catResult.value : []);
        } else {
          console.warn("Failed to fetch categories:", catResult.reason);
          setCategories([]);
        }
      }
    } catch (err) {
      console.error("Favorites screen fetch error:", err);
      setFavorites([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavoritesAndCats();
    }, [token])
  );

  const handleRemove = async (productId: string) => {
    await toggleFavorite(productId);
    setFavorites(prev => (Array.isArray(prev) ? prev : []).filter(f => f && f.product_id !== productId));
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

  const safeFavorites = Array.isArray(favorites) ? favorites : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const favCategoryIds = new Set(safeFavorites.map(f => f?.product?.category_id).filter(Boolean));
  const availableCategories = safeCategories.filter(c => c && favCategoryIds.has(c.id));

  const filteredFavorites = activeFilter === 'All'
    ? safeFavorites
    : safeFavorites.filter(f => f?.product?.category_id === activeFilter);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <Header title={STRINGS.favorites.title} showBack={false} />

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
              label={STRINGS.common.all}
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
              <AppIcon name="heartOutline" size={32} color="#e11d48" />
            </View>
            <Text className="text-lg font-bold text-text-primary mb-1">{STRINGS.favorites.emptyTitle}</Text>
            <Text className="text-text-secondary text-sm text-center px-8">
              {STRINGS.favorites.emptyDescription}
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
