import { View, Text, ScrollView, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { getFavorites, Favorite } from '@/src/api/favorites';
import { getCategories, Category } from '@/src/api/categories';
import { useFavoriteStore } from '@/src/store/favoriteStore';
import Header from '@/src/components/Header';
import FilterPill from '@/src/components/FilterPill';
import FavoriteItemCard from '@/src/components/FavoriteItemCard';
import Button from '@/src/components/Button';

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

  const openWhatsApp = (productName?: string) => {
    const phone = process.env.EXPO_PUBLIC_WHATSAPP_NUMBER || '+1234567890';
    let text = "Hello, I am interested in your bangles.";
    if (productName) {
      text = `Hello, I want to inquire about the ${productName}. Is it available?`;
    } else {
      const names = favorites.map(f => f.product?.product_name).join(", ");
      text = `Hello, I want to inquire about the following items: ${names}`;
    }
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`);
  };

  // Compute dynamically available categories from favorites
  const favCategoryIds = new Set(favorites.map(f => f.product?.category_id).filter(Boolean));
  const availableCategories = categories.filter(c => favCategoryIds.has(c.id));
  
  const filteredFavorites = activeFilter === 'All' 
    ? favorites 
    : favorites.filter(f => f.product?.category_id === activeFilter);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF0F3]">
        <ActivityIndicator size="large" color="#FF1F4B" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FFF0F3]">
      {/* Header */}
      <Header 
        title="My Favorites ❤️"
        subtitle={`${favorites.length} items saved`}
        transparent={true}
        titleClassName="text-[28px] font-extrabold text-[#D81B60] font-serif"
        rightElement={
          <TouchableOpacity className="bg-white p-2.5 rounded-full shadow-sm border border-rose-100">
            <Ionicons name="share-social-outline" size={20} color="#d97706" />
          </TouchableOpacity>
        }
      />

      {/* Filters */}
      <View className="px-6 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
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

      {/* List */}
      <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        {filteredFavorites.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="heart-outline" size={64} color="#fca5a5" />
            <Text className="text-slate-500 mt-4 text-lg">No favorites yet</Text>
          </View>
        ) : (
          filteredFavorites.map((fav) => (
            <FavoriteItemCard
              key={fav.id}
              product={fav.product}
              onRemove={() => handleRemove(fav.product_id)}
              onWhatsApp={() => openWhatsApp(fav.product?.product_name)}
            />
          ))
        )}
      </ScrollView>

      {/* Bottom Floating Action */}
      {favorites.length > 0 && (
        <View className="absolute bottom-20 left-6 right-6 z-20">
          <TouchableOpacity 
            className="bg-[#FF1F4B] flex-row items-center justify-center py-4 rounded-2xl shadow-sm border border-rose-600"
            onPress={() => openWhatsApp()}
          >
            <Text className="text-white font-extrabold text-base mr-2">Inquire All on WhatsApp</Text>
            <Ionicons name="chatbubble-outline" size={18} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
