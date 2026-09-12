import type { Product } from '@/src/api/products';
import { api } from "@/src/api";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image, TextInput } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCategories, Category } from '@/src/api/categories';

export default function CategoryProducts() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [allProductsRes, allCategories] = await Promise.all([
            api.admin.getAdminProducts(1, 100),
            getCategories(),
          ]);

          setCategories(allCategories);

          const found = allCategories.find((c: Category) => c.id === id);
          setCategory(found || null);

          if (!found) {
            setProducts([]);
            setLoading(false);
            return;
          }
          const filtered = allProductsRes.products.filter((p: Product) => p.category_id === found.id);
          setProducts(filtered);
        } catch (error) {
          console.error("Failed to fetch products", error);
        } finally {
          setLoading(false);
        }
      };

      if (id) fetchData();
    }, [id])
  );

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View
        className="px-5 pb-4 bg-primary/5 flex-row items-center"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <TouchableOpacity
          className="w-9 h-9 bg-surface rounded-full items-center justify-center mr-3 border border-divider"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#e11d48" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-primary font-medium text-xs uppercase tracking-wider">Products</Text>
          <Text className="text-xl font-bold text-text-primary" numberOfLines={1}>{category?.category_name || 'Category not found'}</Text>
        </View>
      </View>

      <View className="px-5 py-3">
        <View className="flex-row items-center bg-surface rounded-xl border border-divider px-3">
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor="#94a3b8"
            className="flex-1 px-2 py-2.5 text-text-primary text-sm"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
              <Text className="text-text-hint mt-4 text-base font-medium">
                {search ? 'No products match your search.' : 'No products found.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const cat = categories.find(c => c.id === item.category_id);
            return (
              <TouchableOpacity
                className="w-[48%] bg-surface rounded-2xl mb-4 border border-divider overflow-hidden"
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/product-detail/[id]', params: { id: item.id } } as any)}
              >
                <View className="aspect-[4/3] bg-[#FAFAFA] overflow-hidden">
                  <Image
                    source={{ uri: item.image_url || item.images?.[0] || 'https://via.placeholder.com/150' }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="p-3">
                  <Text className="font-bold text-sm text-text-primary mb-0.5" numberOfLines={1}>{item.product_name}</Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[#C25B3E] font-bold text-sm">₹{item.price}</Text>
                    <View className={`px-1.5 py-0.5 rounded-md ${item.quantity > 0 ? 'bg-success/10' : 'bg-error/10'}`}>
                      <Text className={`text-[9px] font-bold ${item.quantity > 0 ? 'text-success' : 'text-error'}`}>
                        {item.quantity > 0 ? `${item.quantity}` : '0'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
