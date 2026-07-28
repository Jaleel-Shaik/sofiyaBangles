import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { getCategories, Category } from '@/src/api/categories';
import { getModelTypes, ModelType } from '@/src/api/modelTypes';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminProducts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);

  const fetchModelTypesAndCategories = async () => {
    try {
      const [categoriesData, modelTypesData] = await Promise.all([
        getCategories(),
        getModelTypes()
      ]);
      setCategories(categoriesData);
      setModelTypes(modelTypesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchModelTypesAndCategories();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchModelTypesAndCategories();
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View
        className="px-5 pb-5 bg-primary/5 flex-row items-center"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <TouchableOpacity
          className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-3 shadow-sm border border-divider"
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="arrow-back" size={24} color="#e11d48" />
        </TouchableOpacity>
        <View>
          <Text className="text-primary font-medium text-xs uppercase tracking-wider">Admin Panel</Text>
          <Text className="text-xl font-bold text-text-primary">Products</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : (
        <FlatList
          data={modelTypes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e11d48" />
          }
          ListHeaderComponent={
            <Text className="text-text-secondary font-medium mb-3 text-xs uppercase tracking-widest">Select Model Type</Text>
          }
          renderItem={({ item }) => {
            const relatedCats = categories.filter(c => c.model_type_id === item.id);
            const coverImage = relatedCats.find(c => c.image_url)?.image_url;

            return (
              <TouchableOpacity
                className="bg-surface rounded-2xl mb-3 border border-divider overflow-hidden flex-row items-center p-3"
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/model-products/[id]', params: { id: item.id } } as any)}
              >
                <View className="w-28 h-28 bg-slate-50 rounded-xl overflow-hidden mr-4 border border-divider">
                  {coverImage ? (
                    <Image source={{ uri: coverImage }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-slate-100">
                      <Ionicons name="cube" size={28} color="#cbd5e1" />
                    </View>
                  )}
                </View>
                <View className="flex-1 py-1 pr-2">
                  <Text className="font-bold text-base text-text-primary mb-1">{item.name}</Text>
                  <View className="flex-row items-center">
                    <View className="bg-primary/10 px-2 py-1 rounded-md">
                      <Text className="text-primary font-bold text-xs">{relatedCats.length} Categories</Text>
                    </View>
                  </View>
                </View>
                <View className="bg-slate-50 w-8 h-8 rounded-full items-center justify-center border border-divider">
                  <Ionicons name="chevron-forward" size={18} color="#e11d48" />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="grid-outline" size={48} color="#cbd5e1" />
              <Text className="text-text-hint mt-4 text-base font-medium">No Model Types found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
