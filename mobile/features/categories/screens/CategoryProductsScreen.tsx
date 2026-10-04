import type { Product } from '@/src/api/products';
import { api } from "@/src/api";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import ProductCard from '@/src/components/ProductCard';
import Header from '@/src/components/Header';
import SearchInput from '@/src/components/SearchInput';
import { AppIcon } from '@/src/constants/icons';
import { STRINGS } from '@/src/constants/strings';

export default function CategoryScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const categoryId = (typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '') || '';
  const categoryName = (typeof name === 'string' ? name : Array.isArray(name) ? name[0] : '') || STRINGS.collections.title;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef('');
  const isFirstMount = useRef(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchProducts = useCallback(async (query: string = '') => {
    setLoading(true);
    setPage(1);
    try {
      if (!categoryId) {
        setProducts([]);
        setHasMore(false);
        return;
      }
      const response = await api.products.getProducts(1, 20, categoryId, query.trim());
      const safeList = Array.isArray(response?.products) ? response.products.filter(Boolean) : [];
      setProducts(safeList);
      setHasMore(safeList.length >= 20);
    } catch (error) {
      console.error('Failed to fetch category products', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useFocusEffect(
    useCallback(() => {
      if (!categoryId) {
        setLoading(false);
        setProducts([]);
        return;
      }

      if (!searchQueryRef.current.trim()) {
        fetchProducts('');
      }
    }, [categoryId, fetchProducts])
  );

  // Dedicated search debouncing effect - runs independently of navigation listeners
  useEffect(() => {
    searchQueryRef.current = searchQuery;
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!categoryId) return;

    const delayDebounceFn = setTimeout(() => {
      fetchProducts(searchQuery);
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [categoryId, searchQuery, fetchProducts]);

  const loadMore = async () => {
    if (!hasMore || isFetchingMore || !categoryId) return;
    setIsFetchingMore(true);
    const nextPage = page + 1;
    try {
      const response = await api.products.getProducts(nextPage, 20, categoryId, searchQuery.trim());
      const incoming = Array.isArray(response?.products) ? response.products.filter(Boolean) : [];
      if (incoming.length > 0) {
        setProducts((prev) => [...(Array.isArray(prev) ? prev : []), ...incoming]);
        setPage(nextPage);
      }
      if (incoming.length < 20) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more products', error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const safeProducts = useMemo(
    () => (Array.isArray(products) ? products.filter(Boolean) : []),
    [products]
  );

  return (
    <View className="flex-1 bg-background">
      <View className="bg-surface rounded-b-3xl shadow-sm border-b border-divider pb-4">
        <Header
          title={categoryName}
          showBack
          transparent
          titleClassName="text-headline-md font-bold text-text-primary"
        />
        <View className="px-5 mt-2">
          <SearchInput
            placeholder={STRINGS.categoryProducts.searchPlaceholder(categoryName)}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => {
              setSearchQuery('');
              fetchProducts('');
            }}
            onSubmitEditing={() => fetchProducts(searchQuery)}
            onSearchPress={() => fetchProducts(searchQuery)}
            returnKeyType="search"
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#e11d48" />
          <Text className="mt-3 text-text-secondary text-body-sm font-medium">
            {STRINGS.categoryProducts.loading(categoryName)}
          </Text>
        </View>
      ) : (
        <FlatList
          data={safeProducts}
          keyExtractor={(item, idx) => (item?.id ? String(item.id) : `cat-prod-${idx}`)}
          numColumns={2}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 100,
          }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (item && item.id ? <ProductCard product={item} /> : null)}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 mt-6 px-6">
              <View className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 items-center justify-center mb-3">
                <AppIcon name="sparklesOutline" size={30} color="#e11d48" />
              </View>
              <Text className="text-title-md font-bold text-text-primary text-center">
                {searchQuery.trim()
                  ? STRINGS.categoryProducts.emptySearchTitle
                  : STRINGS.categoryProducts.emptyGeneralTitle}
              </Text>
              <Text className="text-text-secondary mt-2 text-center px-6 leading-5 text-body-sm">
                {searchQuery.trim()
                  ? STRINGS.categoryProducts.emptySearchDescription(searchQuery.trim())
                  : STRINGS.categoryProducts.emptyGeneralDescription(categoryName)}
              </Text>
              <TouchableOpacity
                className="mt-5 bg-primary px-6 py-3 min-h-[44px] items-center justify-center rounded-full shadow-sm"
                onPress={() => {
                  if (searchQuery.trim()) {
                    setSearchQuery('');
                    fetchProducts('');
                  } else {
                    router.back();
                  }
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text className="text-white font-bold text-label-md">
                  {searchQuery.trim()
                    ? STRINGS.categoryProducts.clearSearch
                    : STRINGS.categoryProducts.exploreOtherStyles}
                </Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            isFetchingMore ? (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color="#e11d48" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
