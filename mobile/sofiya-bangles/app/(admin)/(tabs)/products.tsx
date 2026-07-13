import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { getCategories, Category } from '../../../src/api/categories';
import { getModelTypes, ModelType } from '../../../src/api/modelTypes';
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
        className="px-6 pb-8 bg-rose-50 rounded-b-[32px] shadow-sm z-10 flex-row items-center" 
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <TouchableOpacity 
          className="w-10 h-10 bg-white rounded-full items-center justify-center mr-4 shadow-sm"
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="arrow-back" size={24} color="#e11d48" />
        </TouchableOpacity>
        <View>
          <Text className="text-[#C25B3E] font-medium text-xs uppercase tracking-wider mb-0.5">Admin Panel</Text>
          <Text className="text-2xl font-extrabold text-rose-700 font-serif tracking-tight">Products</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#C1275A" />
        </View>
      ) : (
        <FlatList
          data={modelTypes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C1275A" />
          }
          ListHeaderComponent={
            <Text className="text-slate-500 font-medium mb-4 text-sm ml-1 uppercase tracking-widest">Select Model Type</Text>
          }
          renderItem={({ item }) => {
            const relatedCats = categories.filter(c => c.model_type_id === item.id);
            const coverImage = relatedCats.find(c => c.image_url)?.image_url;
            
            return (
              <TouchableOpacity 
                className="bg-white rounded-3xl mb-4 shadow-sm border border-slate-100 overflow-hidden flex-row items-center p-3"
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/model-products/[id]', params: { id: item.id } } as any)}
              >
                <View className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden mr-4 border border-slate-100">
                  {coverImage ? (
                    <Image source={{ uri: coverImage }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-slate-100">
                      <Ionicons name="cube" size={32} color="#cbd5e1" />
                    </View>
                  )}
                </View>
                <View className="flex-1 py-2 pr-2">
                  <Text className="font-extrabold text-lg text-slate-800 mb-1">{item.name}</Text>
                  <View className="flex-row items-center">
                    <View className="bg-rose-50 px-2 py-1 rounded-md">
                      <Text className="text-[#C1275A] font-bold text-xs">{relatedCats.length} Categories</Text>
                    </View>
                  </View>
                </View>
                <View className="bg-slate-50 w-10 h-10 rounded-full items-center justify-center mr-2 border border-slate-100">
                  <Ionicons name="chevron-forward" size={20} color="#C1275A" />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="grid-outline" size={64} color="#cbd5e1" />
              <Text className="text-slate-400 mt-4 text-base font-medium">No Model Types found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
