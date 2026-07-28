import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProducts, Product } from '@/src/api/products';
import { getCategories, Category } from '@/src/api/categories';
import { getModelTypes, ModelType } from '@/src/api/modelTypes';

export default function ModelProducts() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modelType, setModelType] = useState<ModelType | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [allProductsRes, allCategories, allModelTypes] = await Promise.all([
            getProducts(1, 100),
            getCategories(),
            getModelTypes()
          ]);

          setCategories(allCategories);

          const currentModel = allModelTypes.find(m => m.id === id);
          setModelType(currentModel || null);

          const validCategoryIds = allCategories.filter(c => c.model_type_id === id).map(c => c.id);
          const filteredProducts = allProductsRes.products.filter((p: Product) => validCategoryIds.includes(p.category_id));
          setProducts(filteredProducts);
        } catch (error) {
          console.error("Failed to fetch model products", error);
        } finally {
          setLoading(false);
        }
      };

      if (id) {
        fetchData();
      }
    }, [id])
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View
        className="px-5 pb-5 bg-primary/5 flex-row items-center"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <TouchableOpacity
          className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-3 border border-divider"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#e11d48" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-primary font-medium text-xs uppercase tracking-wider">Model Products</Text>
          <Text className="text-xl font-bold text-text-primary" numberOfLines={1}>{modelType ? modelType.name : 'Products'}</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
              <Text className="text-text-hint mt-4 text-base font-medium">No products found for this model.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const category = categories.find(c => c.id === item.category_id);
            return (
              <TouchableOpacity
                className="bg-surface rounded-2xl mb-4 border border-divider p-3 flex-row items-center"
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/edit-product/[id]', params: { id: item.id } } as any)}
              >
                <View className="w-28 h-28 bg-[#FAFAFA] rounded-xl overflow-hidden mr-4 border border-divider">
                  <Image
                    source={{ uri: item.image_url || item.images?.[0] || 'https://via.placeholder.com/150' }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="flex-1 py-1 pr-2">
                  <Text className="font-bold text-base text-text-primary mb-1" numberOfLines={1}>{item.product_name}</Text>
                  <Text className="text-text-secondary text-xs mb-2" numberOfLines={1}>{category?.category_name || 'Uncategorized'}</Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[#C25B3E] font-bold">₹{item.price}</Text>
                    <View className={`px-2 py-1 rounded-md ${item.quantity > 0 ? 'bg-success/10' : 'bg-error/10'}`}>
                      <Text className={`text-[10px] font-bold ${item.quantity > 0 ? 'text-success' : 'text-error'}`}>
                        {item.quantity > 0 ? `${item.quantity} in stock` : 'Out of stock'}
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
