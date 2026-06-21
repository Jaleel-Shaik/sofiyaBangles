import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { getCategories, Category } from '../../src/api/categories';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../src/components/Header';
import SearchInput from '../../src/components/SearchInput';
import CategoryItem from '../../src/components/CategoryItem';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCats = async () => {
      const data = await getCategories();
      setCategories(data);
      setLoading(false);
    };
    fetchCats();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF0F3]">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Header 
        title="All Categories" 
        transparent={true}
        titleClassName="text-2xl font-extrabold text-slate-900"
        rightElement={
          <TouchableOpacity className="bg-white p-2.5 rounded-full shadow-sm">
            <Ionicons name="options-outline" size={20} color="#FF1F4B" />
          </TouchableOpacity>
        }
        className="pb-4 bg-[#FFF0F3]"
      />
      
      {/* Search - Visually inside header but placed below */}
      <View className="px-6 bg-[#FFF0F3] pb-6">
        <SearchInput placeholder="Search categories..." showFilter={false} className="border-0 shadow-sm" />
      </View>

      {/* Grid */}
      <View className="px-6 py-6">
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {categories.map((cat) => (
            <CategoryItem 
              key={cat.id}
              name={cat.category_name}
              size="large"
              subtitle={`${Math.floor(Math.random() * 50) + 10} items`}
              onPress={() => router.push({ pathname: '/(tabs)/home', params: { categoryId: cat.id } })}
            />
          ))}
        </View>
      </View>

      {/* Featured Collections */}
      <View className="px-6 mt-2 mb-10">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-slate-800">Featured Collections</Text>
          <TouchableOpacity>
            <Text className="text-[#FF1F4B] font-bold text-xs">See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
          <TouchableOpacity className="bg-[#E94E5A] w-64 h-36 rounded-3xl mr-4 p-5 justify-end overflow-hidden relative shadow-sm">
            <Text className="text-white font-extrabold text-lg z-10 mb-1 leading-5">Bridal Gold{"\n"}Collection</Text>
            <TouchableOpacity className="bg-[#FF1F4B] self-start px-4 py-1.5 rounded-full mt-2 z-10 shadow-sm">
              <Text className="text-white font-bold text-[10px]">Shop Now</Text>
            </TouchableOpacity>
            <View className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          </TouchableOpacity>

          <TouchableOpacity className="bg-[#A6172D] w-64 h-36 rounded-3xl mr-4 p-5 justify-end overflow-hidden relative shadow-sm">
            <Text className="text-white font-extrabold text-lg z-10 mb-1 leading-5">Festival Glass{"\n"}Edition</Text>
            <TouchableOpacity className="bg-[#FF1F4B] self-start px-4 py-1.5 rounded-full mt-2 z-10 shadow-sm">
              <Text className="text-white font-bold text-[10px]">Shop Now</Text>
            </TouchableOpacity>
            <View className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ScrollView>
  );
}
