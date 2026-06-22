import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { getProducts, Product } from '../../../src/api/products';
import ProductCard from '../../../src/components/ProductCard';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data.products || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <View className="px-4 py-4 flex-row items-center justify-between border-b border-slate-100 bg-white">
        <Text className="text-2xl font-extrabold text-[#90132B] font-serif">Products</Text>
        <TouchableOpacity 
          className="bg-[#FF1F4B] p-2 rounded-full shadow-sm flex-row items-center"
          onPress={() => router.push('/(admin)/add-product' as any)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-bold ml-1 mr-2 text-sm">Add New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF1F4B" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF1F4B" />
          }
          renderItem={({ item }) => (
            <ProductCard 
              product={item} 
              // we can pass a custom onPress or modify ProductCard if needed, but for now it redirects to product detail
            />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="cube-outline" size={64} color="#cbd5e1" />
              <Text className="text-slate-400 mt-4 text-base font-medium">No products found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
