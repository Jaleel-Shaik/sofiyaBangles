import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { getProducts, Product } from '@/src/api/products';
import ProductCard from '@/src/components/ProductCard';
import Header from '@/src/components/Header';
import SearchInput from '@/src/components/SearchInput';
import { Ionicons } from '@expo/vector-icons';

export default function CategoryScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const categoryId = id as string;
  const categoryName = name as string || 'Category Products';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!categoryId) return;
      const delayDebounceFn = setTimeout(() => {
        fetchInitialProducts();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }, [categoryId, searchQuery])
  );

  const fetchInitialProducts = async () => {
    setLoading(true);
    setPage(1);
    try {
      const response = await getProducts(1, 20, categoryId, searchQuery.trim());
      setProducts(response.products);
      setHasMore(response.products.length >= 20);
    } catch (error) {
      console.error('Failed to fetch category products', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || isFetchingMore) return;
    setIsFetchingMore(true);
    const nextPage = page + 1;
    try {
      const response = await getProducts(nextPage, 20, categoryId, searchQuery);
      if (response.products.length > 0) {
        setProducts(prev => [...prev, ...response.products]);
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

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="bg-surface rounded-b-3xl shadow-sm border-b border-divider pb-5">
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
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#e11d48" />
          <Text className="mt-3 text-text-secondary font-medium">Loading {categoryName}...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
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
              <Text className="text-lg font-bold text-text-primary">No Products Yet</Text>
              <Text className="text-text-secondary mt-2 text-center px-10 leading-5 text-sm">
                We&apos;re currently restocking our {categoryName} collection. Check back soon!
              </Text>
              <TouchableOpacity
                className="mt-6 bg-primary px-6 py-3 rounded-full"
                onPress={() => router.back()}
              >
                <Text className="text-white font-bold text-sm">Explore Other Styles</Text>
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
