import { View, Text, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { getNewArrivals, Product } from '@/src/api/products';
import ProductCard from '@/src/components/ProductCard';
import Header from '@/src/components/Header';
import FilterPill from '@/src/components/FilterPill';
import { Ionicons } from '@expo/vector-icons';

export default function NewArrivalsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
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
      const response = await getNewArrivals(daysAgo, 1, 20);
      setProducts(response.products);
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
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="bg-surface rounded-b-3xl shadow-sm border-b border-divider">
        <Header
          title="New Arrivals"
          showBack
          transparent
          titleClassName="text-xl font-bold text-text-primary"
        />
        <View className="px-5 pb-5">
          <Text className="text-text-secondary mb-3 text-sm font-medium">Filter by recent drops</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#e11d48" />
          <Text className="mt-3 text-text-secondary font-medium">Fetching the latest pieces...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <ProductCard product={item} />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-24 mt-10">
              <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
                <Ionicons name="time-outline" size={36} color="#e11d48" />
              </View>
              <Text className="text-lg font-bold text-text-primary">No Recent Drops</Text>
              <Text className="text-text-secondary mt-2 text-center px-10 leading-5 text-sm">
                We haven&apos;t added any new products in the selected timeframe.
              </Text>
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
