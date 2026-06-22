import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../src/store/authStore';
import { getProducts, Product } from '../../src/api/products';
import { getCategories, Category } from '../../src/api/categories';
import ProductCard from '../../src/components/ProductCard';
import SearchInput from '../../src/components/SearchInput';
import CategoryItem from '../../src/components/CategoryItem';
import { useRouter } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [fetchedProductsResponse, fetchedCategories] = await Promise.all([
        getProducts(1, 10),
        getCategories()
      ]);
      setProducts(fetchedProductsResponse.products);
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Failed to load home data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-rose-50">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-[#fafafa]"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e11d48']} />}
    >
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
            <Image 
              source={{ uri: user?.avatar_url || 'https://i.pravatar.cc/150?img=47' }} 
              className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
            />
          </TouchableOpacity>
        </View>

        <SearchInput placeholder="Search bangles, styles..." />
      </View>

      {/* Promo Banner */}
      <View className="px-6 mt-6">
        <View className="bg-[#C1275A] rounded-3xl p-6 relative overflow-hidden shadow-sm">
          <View className="w-3/5 z-10">
            <Text className="text-white text-2xl font-bold font-serif mb-4 leading-8">
              New Arrivals Just{"\n"}Dropped ✨
            </Text>
            <TouchableOpacity className="bg-white px-5 py-2.5 rounded-full self-start shadow-sm">
              <Text className="text-[#C1275A] font-bold text-sm">Explore Now</Text>
            </TouchableOpacity>
          </View>
          
          {/* Decorative background circle */}
          <View className="absolute -right-4 -top-10 w-48 h-48 rounded-full bg-white/10" />
          
          {/* Carousel dots */}
          <View className="absolute right-5 bottom-5 flex-row gap-1 z-10 items-center">
            <View className="w-4 h-1.5 bg-white rounded-full" />
            <View className="w-1.5 h-1.5 bg-white/50 rounded-full" />
            <View className="w-1.5 h-1.5 bg-white/50 rounded-full" />
          </View>
        </View>
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
              onPress={() => router.push({ pathname: '/(tabs)/home', params: { categoryId: cat.id } })}
              className="mr-6"
            />
          ))}
        </ScrollView>
      </View>

      {/* New Arrivals Grid */}
      <View className="px-6 mt-8 mb-10">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-slate-800">New Arrivals</Text>
          <TouchableOpacity>
            <Text className="text-rose-500 font-semibold text-sm">See All</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap justify-between">
          {products.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
