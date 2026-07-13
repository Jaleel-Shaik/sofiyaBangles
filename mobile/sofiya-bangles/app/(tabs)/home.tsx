import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../src/store/authStore';
import { getRecommendedProducts, Product } from '../../src/api/products';
import { getCategories, Category } from '../../src/api/categories';
import ProductCard from '../../src/components/ProductCard';
import SearchInput from '../../src/components/SearchInput';
import CategoryItem from '../../src/components/CategoryItem';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setPage(1);
      setActiveSearch(searchQuery.trim());
      const [fetchedProductsResponse, fetchedCategories] = await Promise.all([
        getRecommendedProducts(1, 50, searchQuery.trim()),
        getCategories()
      ]);
      setProducts(fetchedProductsResponse.products);
      setCategories(fetchedCategories);
      setHasMore(fetchedProductsResponse.products.length >= 50);
    } catch (error) {
      console.error('Failed to load home data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || isFetchingMore || loading) return;
    
    setIsFetchingMore(true);
    const nextPage = page + 1;
    try {
      const response = await getRecommendedProducts(nextPage, 10, searchQuery);
      if (response.products.length > 0) {
        setProducts(prev => [...prev, ...response.products]);
        setPage(nextPage);
      }
      if (response.products.length < 10) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more products', error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInitialData();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInitialData();
  }, []);

  const renderHeader = () => (
    <>
      {/* Header */}
      <View className="px-6 pb-4 bg-rose-50 rounded-b-3xl" style={{ paddingTop: Math.max(insets.top + 16, 40) }}>
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-rose-500 font-medium">Good Morning 👋</Text>
            <Text className="text-2xl font-extrabold text-rose-700 mt-1 font-serif">
              Find Your Perfect{"\n"}Bangle
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            {user?.avatar_url ? (
              <Image 
                source={{ uri: user.avatar_url }} 
                className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
              />
            ) : (
              <View className="w-12 h-12 rounded-full border-2 border-white shadow-sm bg-white items-center justify-center">
                <Ionicons name="person" size={24} color="#cbd5e1" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <SearchInput 
          placeholder="Search bangles, styles..." 
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchInitialData}
          onSearchPress={fetchInitialData}
          returnKeyType="search"
        />
      </View>

      {/* Promo Banner */}
      <View className="px-6 mt-6">
            <TouchableOpacity 
              className="bg-[#C1275A] rounded-3xl p-6 relative overflow-hidden shadow-sm"
              onPress={() => router.push('/new-arrivals' as any)}
            >
              <View className="w-3/5 z-10">
                <Text className="text-white text-2xl font-bold font-serif mb-4 leading-8">
                  New Arrivals Just{"\n"}Dropped ✨
                </Text>
                <View className="bg-white px-5 py-2.5 rounded-full self-start shadow-sm">
                  <Text className="text-[#C1275A] font-bold text-sm">Explore Now</Text>
                </View>
              </View>
              
              {/* Decorative background circle */}
              <View className="absolute -right-4 -top-10 w-48 h-48 rounded-full bg-white/10" />
              
              {/* Carousel dots */}
              <View className="absolute right-5 bottom-5 flex-row gap-1 z-10 items-center">
                <View className="w-4 h-1.5 bg-white rounded-full" />
                <View className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                <View className="w-1.5 h-1.5 bg-white/50 rounded-full" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <View className="mt-8">
            <View className="flex-row justify-between items-center px-6 mb-4">
              <Text className="text-lg font-bold text-slate-800">Categories</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/categories')}>
                <Text className="text-rose-500 font-semibold text-sm">See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="pl-6"
              contentContainerStyle={{ paddingRight: 24 }}
            >
              {categories.map((cat: Category) => (
                <CategoryItem 
                  key={cat.id} 
                  name={cat.category_name} 
                  imageUrl={cat.image_url}
                  onPress={() => router.push({ pathname: '/category/[id]', params: { id: cat.id, name: cat.category_name } })}
                  className="mr-6"
                />
              ))}
            </ScrollView>
          </View>

      {/* Grid Header */}
      <View className="px-6 mt-8 mb-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-bold text-slate-800">
            {activeSearch ? `Search Results for "${activeSearch}"` : "Recommended For You"}
          </Text>
          {!activeSearch && (
            <TouchableOpacity>
              <Text className="text-rose-500 font-semibold text-sm">See All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );



  return (
    <View className="flex-1 bg-[#fafafa]">
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 24 }}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e11d48']} />}
        ListHeaderComponent={renderHeader()}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          const cat = categories.find(c => c.id === item.category_id);
          return <ProductCard product={item} categoryId={cat?.id} />;
        }}
        ListEmptyComponent={
          loading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#e11d48" />
            </View>
          ) : (
            <View className="py-20 items-center justify-center">
              <Text className="text-slate-500 font-medium">No products found.</Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingMore ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#e11d48" />
            </View>
          ) : null
        }
      />
    </View>
  );
}
