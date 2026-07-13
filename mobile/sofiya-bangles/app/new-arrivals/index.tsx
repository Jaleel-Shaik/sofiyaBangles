import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getNewArrivals, Product } from '../../src/api/products';
import { getCategories, Category } from '../../src/api/categories';
import ProductCard from '../../src/components/ProductCard';
import Header from '../../src/components/Header';
import FilterPill from '../../src/components/FilterPill';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NewArrivalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysAgo, setDaysAgo] = useState(1);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  useEffect(() => {
    fetchInitialProducts();
  }, [daysAgo]);

  const fetchInitialProducts = async () => {
    setLoading(true);
    setPage(1);
    try {
      const [response, fetchedCategories] = await Promise.all([
        getNewArrivals(daysAgo, 1, 20),
        getCategories()
      ]);
      setProducts(response.products);
      setCategories(fetchedCategories);
      setHasMore(response.products.length >= 20);
    } catch (error) {
      console.error('Failed to fetch new arrivals', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || isFetchingMore || loading) return;
    
    setIsFetchingMore(true);
    const nextPage = page + 1;
    try {
      const response = await getNewArrivals(daysAgo, nextPage, 20);
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
      {/* Header */}
      <Header 
        title="New Arrivals"
        showBack={true}
        transparent={true}
        titleClassName="text-2xl font-extrabold text-slate-900 font-serif"
        className="pb-4 bg-[#FFF0F3]"
      />

      <View className="bg-[#FFF0F3] px-6 pb-6 rounded-b-3xl shadow-sm z-10">
        <Text className="text-slate-500 mb-3 text-sm font-medium">Filter by recent drops</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <FilterPill 
            label="Past 24 Hours" 
            isActive={daysAgo === 1} 
            onPress={() => setDaysAgo(1)} 
            className="mr-2"
          />
          <FilterPill 
            label="Past 5 Days" 
            isActive={daysAgo === 5} 
            onPress={() => setDaysAgo(5)} 
            className="mr-2"
          />
          <FilterPill 
            label="Past 7 Days" 
            isActive={daysAgo === 7} 
            onPress={() => setDaysAgo(7)} 
            className="mr-2"
          />
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center bg-white">
          <ActivityIndicator size="large" color="#FF1F4B" />
          <Text className="mt-4 text-slate-500 font-medium">Fetching the latest pieces...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 40 }}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => {
            const cat = categories.find(c => c.id === item.category_id);
            return <ProductCard product={item} categoryId={cat?.id} />;
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-24 mt-10">
              <View className="w-24 h-24 rounded-full bg-rose-50 items-center justify-center mb-6">
                <Ionicons name="time-outline" size={40} color="#FF1F4B" />
              </View>
              <Text className="text-xl font-bold text-slate-800 font-serif">No Recent Drops</Text>
              <Text className="text-slate-400 mt-2 text-center px-10 leading-6">
                We haven't added any new products in the selected timeframe.
              </Text>
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
