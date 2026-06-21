import { View, Text, ScrollView, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { getFavorites, removeFavorite, Favorite } from '../../src/api/favorites';
import Header from '../../src/components/Header';
import FilterPill from '../../src/components/FilterPill';
import FavoriteItemCard from '../../src/components/FavoriteItemCard';
import Button from '../../src/components/Button';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchFavorites = async () => {
    const data = await getFavorites();
    setFavorites(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemove = async (productId: string) => {
    try {
      await removeFavorite(productId);
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
          <TouchableOpacity className="bg-white p-2.5 rounded-full shadow-sm border border-rose-100 mt-2">
            <Ionicons name="share-social-outline" size={20} color="#d97706" />
          </TouchableOpacity>
        }
      />

      {/* Filters */}
      <View className="px-6 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
          {['All', 'Bridal', 'Glass', 'Stone', 'Metal'].map((filter) => (
            <FilterPill 
              key={filter}
              label={filter}
              isActive={activeFilter === filter}
              onPress={() => setActiveFilter(filter)}
            />
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {favorites.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="heart-outline" size={64} color="#fca5a5" />
            <Text className="text-slate-500 mt-4 text-lg">No favorites yet</Text>
          </View>
        ) : (
          favorites.map((fav) => (
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
        <View className="absolute bottom-6 left-6 right-6">
          <TouchableOpacity 
            className="bg-[#FF1F4B] flex-row items-center justify-center py-4 rounded-3xl shadow-sm"
            onPress={() => openWhatsApp()}
          >
            <Text className="text-white font-extrabold text-base mr-2">Inquire All on WhatsApp</Text>
            <Ionicons name="cloud" size={16} color="white" className="mr-1" />
            <Ionicons name="chatbubble-outline" size={18} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
