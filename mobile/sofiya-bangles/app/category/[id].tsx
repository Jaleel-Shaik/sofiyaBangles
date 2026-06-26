import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getProducts, Product } from '../../src/api/products';
import ProductCard from '../../src/components/ProductCard';
import Header from '../../src/components/Header';
import SearchInput from '../../src/components/SearchInput';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams();
  const categoryId = id as string;
  const categoryName = name as string || 'Category Products';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  useEffect(() => {
    if (!categoryId) return;
    
    const delayDebounceFn = setTimeout(() => {
      fetchInitialProducts();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [categoryId, searchQuery]);

  const fetchInitialProducts = async () => {
    setLoading(true);
    setPage(1);
    setActiveSearch(searchQuery.trim());
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
    if (!hasMore || isFetchingMore || loading) return;
    
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
    <View className="flex-1 bg-white">
      {/* Premium Header Container */}
      <View className="bg-[#FFF0F3] rounded-b-3xl shadow-sm z-10 pb-6">
        <Header 
          title={categoryName}
          showBack={true}
          transparent={true}
          titleClassName="text-2xl font-extrabold text-slate-900 font-serif"
          rightElement={
            <TouchableOpacity className="bg-white p-2.5 rounded-full shadow-sm">
              <Ionicons name="options-outline" size={20} color="#FF1F4B" />
            </TouchableOpacity>
          }
          className="pb-2"
        />
        <View className="px-6 mt-2">
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

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center bg-white">
          <ActivityIndicator size="large" color="#FF1F4B" />
          <Text className="mt-4 text-slate-500 font-medium">Curating {categoryName}...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 40 }}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => <ProductCard product={item} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-24 mt-10">
              <View className="w-24 h-24 rounded-full bg-rose-50 items-center justify-center mb-6">
                <Ionicons name="sparkles-outline" size={40} color="#FF1F4B" />
              </View>
              <Text className="text-xl font-bold text-slate-800 font-serif">No Products Yet</Text>
              <Text className="text-slate-400 mt-2 text-center px-10 leading-6">
                We're currently restocking our {categoryName} collection. Check back soon for beautiful additions!
              </Text>
              <TouchableOpacity 
                className="mt-8 bg-[#FF1F4B] px-8 py-3.5 rounded-full shadow-sm"
                onPress={() => router.back()}
              >
                <Text className="text-white font-bold text-base">Explore Other Styles</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            isFetchingMore ? (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color="#FF1F4B" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
