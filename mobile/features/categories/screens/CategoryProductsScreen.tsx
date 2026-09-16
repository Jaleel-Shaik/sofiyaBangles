import type { Product } from '@/src/api/products';
import { api } from "@/src/api";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { useSizeStore } from '@/src/store/sizeStore';
import { useAuthStore } from '@/src/store/authStore';

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

  const { token, user } = useAuthStore();
  const { preferences, fetchPreferences } = useSizeStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchInitialProducts = async () => {
    setLoading(true);
    setPage(1);
    try {
      if (!categoryId) {
        setProducts([]);
        setHasMore(false);
        return;
      }
      const response = await api.products.getProducts(1, 20, categoryId, (searchQuery || '').trim());
      const safeList = Array.isArray(response?.products) ? response.products.filter(Boolean) : [];
      setProducts(safeList);
      setHasMore(safeList.length >= 20);
    } catch (error) {
      console.error('Failed to fetch category products', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (token && user?.role === 'user') {
        try {
          fetchPreferences();
        } catch (e) {
          console.warn("Failed to fetch preferences:", e);
        }
      }
      if (!categoryId) {
        setLoading(false);
        setProducts([]);
        return;
      }

      // Immediate fetch if no search query
      if (!searchQuery.trim()) {
        fetchInitialProducts();
        return;
      }

      // Debounce active search query typing
      const delayDebounceFn = setTimeout(() => {
        fetchInitialProducts();
      }, 400);
      return () => clearTimeout(delayDebounceFn);
    }, [categoryId, searchQuery, token, user?.role])
  );

  const loadMore = async () => {
    if (!hasMore || isFetchingMore || !categoryId) return;
    setIsFetchingMore(true);
    const nextPage = page + 1;
    try {
      const response = await api.products.getProducts(nextPage, 20, categoryId, searchQuery);
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

  // Find user preference specific to this category
  const categoryPref = useMemo(() => {
    const safePrefs = Array.isArray(preferences) ? preferences : [];
    return safePrefs.find((p) => p && p.category_id === categoryId && !p.is_custom);
  }, [preferences, categoryId]);

  const customCategoryPref = useMemo(() => {
    const safePrefs = Array.isArray(preferences) ? preferences : [];
    return safePrefs.find((p) => p && p.category_id === categoryId && p.is_custom);
  }, [preferences, categoryId]);

  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    const safeList = Array.isArray(products) ? products.filter(Boolean) : [];
    safeList.forEach((p) => {
      if (p?.has_variants && Array.isArray(p.variants)) {
        p.variants.forEach((v) => {
          if (v && v.size && (v.quantity || 0) > 0) sizeSet.add(String(v.size));
        });
      }
    });
    return Array.from(sizeSet);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products.filter(Boolean) : [];
    if (selectedSizeFilter === 'all') return list;

    if (selectedSizeFilter === 'my_size') {
      return list.filter((p) => {
        if (!p) return false;
        if (p.accepts_custom_size && customCategoryPref) return true;
        if (categoryPref?.standard_size && p.has_variants && Array.isArray(p.variants)) {
          return p.variants.some(
            (v) => v && v.size === categoryPref.standard_size && (v.quantity || 0) > 0
          );
        }
        if (!p.has_variants) return true;
        return false;
      });
    }

    if (selectedSizeFilter === 'custom') {
      return list.filter((p) => p && p.accepts_custom_size);
    }

    return list.filter((p) => {
      if (!p) return false;
      if (p.has_variants && Array.isArray(p.variants)) {
        return p.variants.some(
          (v) => v && v.size === selectedSizeFilter && (v.quantity || 0) > 0
        );
      }
      return false;
    });
  }, [products, selectedSizeFilter, categoryPref, customCategoryPref]);

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
            onClear={() => setSearchQuery('')}
            onSubmitEditing={fetchInitialProducts}
            onSearchPress={fetchInitialProducts}
            returnKeyType="search"
          />
        </View>

        {/* Size Filter Bar with 44px Touch Targets */}
        <View className="mt-3 px-5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
            {/* All */}
            <TouchableOpacity
              onPress={() => setSelectedSizeFilter('all')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.categoryProducts.allSizes}
              className={`mr-2.5 px-4 min-h-[44px] justify-center items-center rounded-full border shadow-xs ${
                selectedSizeFilter === 'all'
                  ? 'bg-primary border-primary'
                  : 'bg-white border-divider'
              }`}
            >
              <Text
                className={`text-label-sm font-semibold ${
                  selectedSizeFilter === 'all' ? 'text-white font-bold' : 'text-text-secondary'
                }`}
              >
                {STRINGS.categoryProducts.allSizes}
              </Text>
            </TouchableOpacity>

            {/* My Category Size */}
            {categoryPref?.standard_size && (
              <TouchableOpacity
                onPress={() => setSelectedSizeFilter('my_size')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={STRINGS.categoryProducts.mySize(categoryPref.standard_size)}
                className={`mr-2.5 px-4 min-h-[44px] justify-center items-center rounded-full border flex-row shadow-xs ${
                  selectedSizeFilter === 'my_size'
                    ? 'bg-primary border-primary'
                    : 'bg-rose-50 border-rose-200'
                }`}
              >
                <AppIcon
                  name="sparkles"
                  size={13}
                  color={selectedSizeFilter === 'my_size' ? 'white' : '#e11d48'}
                />
                <Text
                  className={`text-label-sm font-semibold ml-1.5 ${
                    selectedSizeFilter === 'my_size' ? 'text-white font-bold' : 'text-primary'
                  }`}
                >
                  {STRINGS.categoryProducts.mySize(categoryPref.standard_size)}
                </Text>
              </TouchableOpacity>
            )}

            {/* Product Sizes */}
            {(availableSizes || []).map((sz) => (
              <TouchableOpacity
                key={sz}
                onPress={() => setSelectedSizeFilter(sz)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={STRINGS.categoryProducts.sizeLabel(sz)}
                className={`mr-2.5 px-4 min-h-[44px] justify-center items-center rounded-full border shadow-xs ${
                  selectedSizeFilter === sz
                    ? 'bg-primary border-primary'
                    : 'bg-white border-divider'
                }`}
              >
                <Text
                  className={`text-label-sm font-semibold ${
                    selectedSizeFilter === sz ? 'text-white font-bold' : 'text-text-secondary'
                  }`}
                >
                  {STRINGS.categoryProducts.sizeLabel(sz)}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Custom Sized */}
            <TouchableOpacity
              onPress={() => setSelectedSizeFilter('custom')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.categoryProducts.customFilter}
              className={`mr-5 px-4 min-h-[44px] justify-center items-center rounded-full border flex-row shadow-xs ${
                selectedSizeFilter === 'custom'
                  ? 'bg-primary border-primary'
                  : 'bg-white border-divider'
              }`}
            >
              <AppIcon
                name="ruler"
                size={13}
                color={selectedSizeFilter === 'custom' ? 'white' : '#64748b'}
              />
              <Text
                className={`text-label-sm font-semibold ml-1.5 ${
                  selectedSizeFilter === 'custom' ? 'text-white font-bold' : 'text-text-secondary'
                }`}
              >
                {STRINGS.categoryProducts.customFilter}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
          data={Array.isArray(filteredProducts) ? filteredProducts : []}
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
              <Text className="text-title-md font-bold text-text-primary">
                {selectedSizeFilter !== 'all' ? STRINGS.categoryProducts.emptySizeTitle : STRINGS.categoryProducts.emptyGeneralTitle}
              </Text>
              <Text className="text-text-secondary mt-2 text-center px-6 leading-5 text-body-sm">
                {selectedSizeFilter !== 'all'
                  ? STRINGS.categoryProducts.emptySizeDescription(selectedSizeFilter === 'my_size' ? (categoryPref?.standard_size || 'your size') : selectedSizeFilter)
                  : STRINGS.categoryProducts.emptyGeneralDescription(categoryName)}
              </Text>
              <TouchableOpacity
                className="mt-5 bg-primary px-6 py-3 min-h-[44px] items-center justify-center rounded-full shadow-sm"
                onPress={() => (selectedSizeFilter !== 'all' ? setSelectedSizeFilter('all') : router.back())}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text className="text-white font-bold text-label-md">
                  {selectedSizeFilter !== 'all' ? STRINGS.categoryProducts.viewAllSizes : STRINGS.categoryProducts.exploreOtherStyles}
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
