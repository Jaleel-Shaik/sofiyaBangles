import type { Category } from '@/src/api/categories';
import { api } from "@/src/api";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';

import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/src/components/Header';
import SearchInput from '@/src/components/SearchInput';
import CategoryItem from '@/src/components/CategoryItem';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const fetchCats = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    const data = await api.categories.getCategories();
    setCategories(data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchCats();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCats(true);
  }, []);

  const filteredCategories = categories.filter(cat =>
    cat.category_name.toLowerCase().includes(activeSearch)
  );

  if (loading) {
    return (
      <View className="flex-1 bg-[#FAFAFA]">
        <View className="flex-1 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
            <Ionicons name="grid-outline" size={28} color="#e11d48" />
          </View>
          <ActivityIndicator size="large" color="#e11d48" />
          <Text className="mt-3 text-text-secondary font-medium">Loading categories...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#e11d48"]} />
        }
      >
        <View className="bg-surface rounded-b-3xl shadow-sm border-b border-divider">
          <Header
            title="Categories"
            transparent
            titleClassName="text-2xl font-bold text-text-primary"
          />
          <View className="px-5 pb-5">
            <SearchInput
              placeholder="Search categories..."
              showFilter={false}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View className="px-4 pt-6">
          {filteredCategories.length > 0 ? (
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {filteredCategories.map((cat) => (
                <View key={cat.id} style={{ width: '47%' }}>
                  <CategoryItem
                    name={cat.category_name}
                    imageUrl={cat.image_url}
                    size="large"
                    onPress={() => router.push({
                      pathname: '/category/[id]',
                      params: { id: cat.id, name: cat.category_name }
                    })}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View className="w-full py-20 items-center justify-center">
              <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
                <Ionicons name="search-outline" size={32} color="#e11d48" />
              </View>
              <Text className="text-lg font-bold text-text-primary mb-1">No categories found</Text>
              <Text className="text-text-secondary text-sm text-center px-8">
                We couldn&apos;t find any categories matching &quot;{activeSearch}&quot;
              </Text>
              <TouchableOpacity
                className="mt-5 bg-primary px-6 py-3 rounded-full"
                onPress={() => setSearchQuery('')}
              >
                <Text className="text-white font-bold text-sm">Clear Search</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}