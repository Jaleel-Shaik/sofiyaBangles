import type { Category } from '@/src/api/categories';
import { api } from "@/src/api";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';

import { useRouter, useFocusEffect } from 'expo-router';
import Header from '@/src/components/Header';
import SearchInput from '@/src/components/SearchInput';
import CategoryItem from '@/src/components/CategoryItem';
import { AppIcon } from '@/src/constants/icons';
import { STRINGS } from '@/src/constants/strings';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCats = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await api.categories.getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const query = (searchQuery || '').toLowerCase().trim();
  const safeCategories = Array.isArray(categories) ? categories : [];
  const filteredCategories = safeCategories.filter((cat) => {
    if (!cat) return false;
    const catName = (cat.category_name || cat.name || '').toLowerCase();
    return catName.includes(query);
  });

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-rose-50 items-center justify-center mb-4 border border-rose-100">
            <AppIcon name="gridOutline" size={28} color="#e11d48" />
          </View>
          <ActivityIndicator size="large" color="#e11d48" />
          <Text className="mt-3 text-text-secondary text-body-sm font-medium">{STRINGS.collections.loading}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
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
            title={STRINGS.collections.title}
            transparent
            titleClassName="text-headline-lg font-bold text-text-primary"
          />
          <View className="px-5 pb-5">
            <SearchInput
              placeholder={STRINGS.collections.searchPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  router.push({ pathname: '/search', params: { q: searchQuery.trim() } } as any);
                }
              }}
              onSearchPress={() => {
                router.push({
                  pathname: '/search',
                  params: searchQuery.trim() ? { q: searchQuery.trim() } : undefined
                } as any);
              }}
              returnKeyType="search"
            />
          </View>
        </View>

        <View className="px-4 pt-6">
          {(filteredCategories || []).length > 0 ? (
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {(filteredCategories || []).map((cat, idx) => {
                const displayName = cat?.category_name || cat?.name || 'Collection';
                const catId = cat?.id || `cat-${idx}`;
                return (
                  <View key={catId} style={{ width: '47%' }}>
                    <CategoryItem
                      name={displayName}
                      imageUrl={cat?.image_url}
                      size="large"
                      onPress={() => {
                        if (cat?.id) {
                          router.push({
                            pathname: '/category/[id]',
                            params: { id: cat.id, name: displayName }
                          });
                        }
                      }}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="w-full py-16 items-center justify-center">
              <View className="w-16 h-16 rounded-full bg-rose-50 items-center justify-center mb-4 border border-rose-100">
                <AppIcon name="searchOutline" size={28} color="#e11d48" />
              </View>
              <Text className="text-title-md font-bold text-text-primary mb-1">{STRINGS.collections.emptyTitle}</Text>
              <Text className="text-text-secondary text-body-sm text-center px-8 leading-5">
                {STRINGS.collections.emptyDescription(searchQuery)}
              </Text>
              <TouchableOpacity
                className="mt-5 bg-primary px-6 py-3 rounded-full min-h-[44px] items-center justify-center shadow-sm"
                onPress={() => setSearchQuery('')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={STRINGS.common.clearSearch}
              >
                <Text className="text-white text-label-md font-bold">{STRINGS.common.clearSearch}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}