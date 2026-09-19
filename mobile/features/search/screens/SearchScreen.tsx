import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Product } from '@/src/api/products';
import { api } from '@/src/api';
import Header from '@/src/components/Header';
import SearchInput from '@/src/components/SearchInput';
import ProductCard from '@/src/components/ProductCard';
import { AppIcon } from '@/src/constants/icons';
import { STRINGS } from '@/src/constants/strings';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialQuery = typeof params.q === 'string' ? params.q : '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const fetchResults = async (query: string) => {
    const clean = (query || '').trim();
    if (!clean) {
      setProducts([]);
      setTotalResults(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.products.getProducts(1, 30, undefined, clean);
      const safeProds = Array.isArray(response?.products) ? response.products.filter(Boolean) : [];
      setProducts(safeProds);
      setTotalResults(response?.total || safeProds.length);
    } catch (err) {
      console.warn('Search query error:', err);
      setProducts([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setProducts([]);
      setTotalResults(0);
      return;
    }

    const timer = setTimeout(() => {
      fetchResults(searchQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResults(searchQuery);
  }, [searchQuery]);

  return (
    <View className="flex-1 bg-background">
      <View className="bg-surface rounded-b-3xl shadow-sm border-b border-divider pb-4">
        <Header
          title={STRINGS.common.search}
          showBack
          transparent
          titleClassName="text-headline-md font-bold text-text-primary"
        />
        <View className="px-5 mt-2">
          <SearchInput
            autoFocus
            placeholder={STRINGS.home.searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            onSubmitEditing={() => fetchResults(searchQuery)}
            onSearchPress={() => fetchResults(searchQuery)}
            returnKeyType="search"
          />
        </View>
        {searchQuery.trim().length > 0 && !loading && (
          <View className="px-5 pt-3 flex-row justify-between items-center">
            <Text className="text-body-sm font-medium text-text-secondary">
              {STRINGS.home.searchResults(searchQuery.trim())}
            </Text>
            <Text className="text-label-sm font-bold text-primary">
              {totalResults} {totalResults === 1 ? 'result' : 'results'}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#e11d48" />
          <Text className="text-body-sm text-text-secondary mt-3 font-medium">
            {STRINGS.home.states.loadingRecommendations}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, idx) => item?.id ? String(item.id) : `search-item-${idx}`}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 100,
          }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#e11d48']}
            />
          }
          renderItem={({ item }) => (item?.id ? <ProductCard product={item} /> : null)}
          ListEmptyComponent={
            searchQuery.trim() ? (
              <View className="items-center justify-center py-20 px-6">
                <View className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 items-center justify-center mb-3">
                  <AppIcon name="searchOutline" size={28} color="#e11d48" />
                </View>
                <Text className="text-title-md font-bold text-text-primary text-center mb-1">
                  {STRINGS.home.states.noSearchTitle}
                </Text>
                <Text className="text-text-secondary text-body-sm text-center mb-5 leading-5 px-6">
                  {STRINGS.home.states.noSearchDescription(searchQuery.trim())}
                </Text>
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  className="bg-primary px-6 py-3 rounded-full min-h-[44px] justify-center items-center shadow-sm"
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={STRINGS.common.clearSearch}
                >
                  <Text className="text-white text-label-md font-bold">
                    {STRINGS.common.clearSearch}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="items-center justify-center py-24 px-6">
                <View className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 items-center justify-center mb-3">
                  <AppIcon name="sparklesOutline" size={28} color="#e11d48" />
                </View>
                <Text className="text-title-md font-bold text-text-primary text-center mb-1">
                  Discover Handcrafted Bangles
                </Text>
                <Text className="text-text-secondary text-body-sm text-center px-6 leading-5">
                  Type a product name, style (e.g. Bridal, Daily), or code to find the perfect match.
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}
