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
import { Ionicons } from '@expo/vector-icons';

export default function CategoryScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const categoryId = id as string;
  const categoryName = (name as string) || 'Category Products';

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
      const response = await api.products.getProducts(1, 20, categoryId, searchQuery.trim());
      setProducts(response.products);
      setHasMore(response.products.length >= 20);
    } catch (error) {
      console.error('Failed to fetch category products', error);
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
      if (!categoryId) return;

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
    if (!hasMore || isFetchingMore) return;
    setIsFetchingMore(true);
    const nextPage = page + 1;
    try {
      const response = await api.products.getProducts(nextPage, 20, categoryId, searchQuery);
      if (response.products.length > 0) {
        setProducts((prev) => [...prev, ...response.products]);
        setPage(nextPage);
      }
      if (response.products.length < 20) {
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
    return preferences.find((p) => p.category_id === categoryId && !p.is_custom);
  }, [preferences, categoryId]);

  const customCategoryPref = useMemo(() => {
    return preferences.find((p) => p.category_id === categoryId && p.is_custom);
  }, [preferences, categoryId]);

  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    products.forEach((p) => {
      if (p.has_variants && p.variants) {
        p.variants.forEach((v) => {
          if (v.size && v.quantity > 0) sizeSet.add(v.size);
        });
      }
    });
    return Array.from(sizeSet);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedSizeFilter === 'all') return products;

    if (selectedSizeFilter === 'my_size') {
      return products.filter((p) => {
        if (p.accepts_custom_size && customCategoryPref) return true;
        if (categoryPref?.standard_size && p.has_variants && p.variants) {
          return p.variants.some(
            (v) => v.size === categoryPref.standard_size && v.quantity > 0
          );
        }
        if (!p.has_variants) return true;
        return false;
      });
    }

    if (selectedSizeFilter === 'custom') {
      return products.filter((p) => p.accepts_custom_size);
    }

    return products.filter((p) => {
      if (p.has_variants && p.variants) {
        return p.variants.some(
          (v) => v.size === selectedSizeFilter && v.quantity > 0
        );
      }
      return false;
    });
  }, [products, selectedSizeFilter, categoryPref, customCategoryPref]);

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="bg-surface rounded-b-3xl shadow-sm border-b border-divider pb-4">
        <Header
          title={categoryName}
          showBack
          transparent
          titleClassName="text-xl font-bold text-text-primary"
        />
        <View className="px-5 mt-2">
          <SearchInput
            placeholder={`Search ${categoryName}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchInitialProducts}
            onSearchPress={fetchInitialProducts}
            returnKeyType="search"
          />
        </View>

        {/* Size Filter Bar */}
        <View className="mt-3 px-5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
            {/* All */}
            <TouchableOpacity
              onPress={() => setSelectedSizeFilter('all')}
              className={`mr-2 px-3.5 py-1.5 rounded-full border ${
                selectedSizeFilter === 'all'
                  ? 'bg-primary border-primary'
                  : 'bg-white border-divider'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedSizeFilter === 'all' ? 'text-white' : 'text-text-secondary'
                }`}
              >
                All Sizes
              </Text>
            </TouchableOpacity>

            {/* My Category Size */}
            {categoryPref?.standard_size && (
              <TouchableOpacity
                onPress={() => setSelectedSizeFilter('my_size')}
                className={`mr-2 px-3.5 py-1.5 rounded-full border flex-row items-center ${
                  selectedSizeFilter === 'my_size'
                    ? 'bg-primary border-primary'
                    : 'bg-rose-50 border-rose-200'
                }`}
              >
                <Ionicons
                  name="sparkles"
                  size={12}
                  color={selectedSizeFilter === 'my_size' ? 'white' : '#e11d48'}
                />
                <Text
                  className={`text-xs font-bold ml-1 ${
                    selectedSizeFilter === 'my_size' ? 'text-white' : 'text-primary'
                  }`}
                >
                  My Size: {categoryPref.standard_size} ★
                </Text>
              </TouchableOpacity>
            )}

            {/* Product Sizes */}
            {availableSizes.map((sz) => (
              <TouchableOpacity
                key={sz}
                onPress={() => setSelectedSizeFilter(sz)}
                className={`mr-2 px-3.5 py-1.5 rounded-full border ${
                  selectedSizeFilter === sz
                    ? 'bg-primary border-primary'
                    : 'bg-white border-divider'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    selectedSizeFilter === sz ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  Size {sz}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Custom Sized */}
            <TouchableOpacity
              onPress={() => setSelectedSizeFilter('custom')}
              className={`mr-4 px-3.5 py-1.5 rounded-full border flex-row items-center ${
                selectedSizeFilter === 'custom'
                  ? 'bg-primary border-primary'
                  : 'bg-white border-divider'
              }`}
            >
              <Ionicons
                name="cut-outline"
                size={12}
                color={selectedSizeFilter === 'custom' ? 'white' : '#64748b'}
              />
              <Text
                className={`text-xs font-bold ml-1 ${
                  selectedSizeFilter === 'custom' ? 'text-white' : 'text-text-secondary'
                }`}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#e11d48" />
          <Text className="mt-3 text-text-secondary font-medium">
            Loading {categoryName}...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
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
          renderItem={({ item }) => <ProductCard product={item} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-24 mt-10">
              <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
                <Ionicons name="sparkles-outline" size={36} color="#e11d48" />
              </View>
              <Text className="text-lg font-bold text-text-primary">
                {selectedSizeFilter !== 'all' ? 'No Products in this Size' : 'No Products Yet'}
              </Text>
              <Text className="text-text-secondary mt-2 text-center px-10 leading-5 text-sm">
                {selectedSizeFilter !== 'all'
                  ? `There are currently no products available in ${selectedSizeFilter === 'my_size' ? 'your size' : selectedSizeFilter}. Try selecting All Sizes.`
                  : `We're currently restocking our ${categoryName} collection. Check back soon!`}
              </Text>
              <TouchableOpacity
                className="mt-6 bg-primary px-6 py-3 rounded-full"
                onPress={() => (selectedSizeFilter !== 'all' ? setSelectedSizeFilter('all') : router.back())}
              >
                <Text className="text-white font-bold text-sm">
                  {selectedSizeFilter !== 'all' ? 'View All Sizes' : 'Explore Other Styles'}
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
