import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getOverviewAnalytics } from '../../../src/api/admin';
import { useAuthStore } from '../../../src/store/authStore';
import { getProducts, Product } from '../../../src/api/products';
import { getCategories, Category } from '../../../src/api/categories';

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [data, productsData, cats] = await Promise.all([
          getOverviewAnalytics(),
          getProducts(1, 5),
          getCategories()
        ]);
        setStats(data);
        setRecentProducts(productsData.products || []);
        setCategories(cats);
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View 
          className="px-6 pb-8 bg-rose-50 rounded-b-[32px] shadow-sm mb-6" 
          style={{ paddingTop: Math.max(insets.top + 16, 40) }}
        >
          <View className="flex-row items-center">
            <View>
              <Text className="text-[#C25B3E] font-medium text-xs uppercase tracking-wider mb-0.5">Admin Panel</Text>
              <Text className="text-2xl font-extrabold text-rose-700 mt-1 font-serif">Welcome, {user?.full_name || 'Admin'}</Text>
            </View>
          </View>
        </View>

        <View className="px-4">
        {/* Stats Grid */}
        <Text className="text-lg font-bold text-slate-800 mb-4">Overview</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#C1275A" />
        ) : (
          <View className="flex-row flex-wrap justify-between mb-8">
            <StatCard 
              title="Total Products" 
              value={stats?.totalProducts?.toString() || "0"} 
              icon="cube-outline" 
              color="#3b82f6" 
            />
            <StatCard 
              title="Categories" 
              value={stats?.totalCategories?.toString() || "0"} 
              icon="list-outline" 
              color="#f59e0b" 
            />
          </View>
        )}

        {/* Quick Actions */}
        <Text className="text-lg font-bold text-slate-800 mb-4">Quick Actions</Text>
        <View className="flex-row mb-8">
          <TouchableOpacity 
            className="flex-1 bg-[#C1275A] p-4 rounded-2xl items-center shadow-sm mr-2"
            onPress={() => router.push('/(admin)/(tabs)/add' as any)}
          >
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text className="text-white font-bold mt-2">Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 bg-white p-4 rounded-2xl items-center shadow-sm border border-slate-100 ml-2"
            onPress={() => router.push('/(admin)/(tabs)/products' as any)}
          >
            <Ionicons name="cube-outline" size={24} color="#C1275A" />
            <Text className="text-[#C1275A] font-bold mt-2">Manage</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row mb-8">
          <TouchableOpacity 
            className="flex-1 bg-white p-4 rounded-2xl items-center shadow-sm border border-slate-100 mr-2"
            onPress={() => router.push('/(admin)/(tabs)/categories' as any)}
          >
            <Ionicons name="folder-open-outline" size={24} color="#f59e0b" />
            <Text className="text-[#f59e0b] font-bold mt-2">Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 bg-white p-4 rounded-2xl items-center shadow-sm border border-slate-100 ml-2"
            onPress={() => router.push('/(admin)/(tabs)/manage-model-types' as any)}
          >
            <Ionicons name="layers-outline" size={24} color="#8b5cf6" />
            <Text className="text-[#8b5cf6] font-bold mt-2">Model Types</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Products */}
        <Text className="text-lg font-bold text-slate-800 mb-4">Recent Products</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#C1275A" />
        ) : recentProducts.length === 0 ? (
          <Text className="text-slate-500 text-center py-4">No products found.</Text>
        ) : (
          <View className="mb-8">
            {recentProducts.slice(0, 5).map((product) => {
              const category = categories.find(c => c.id === product.category_id);
              const modelTypeId = category?.model_type_id;

              return (
                <TouchableOpacity 
                  key={product.id}
                  className="bg-white p-4 rounded-2xl flex-row items-center mb-4 shadow-sm border border-slate-100"
                  onPress={() => {
                    router.push({ pathname: '/(admin)/(tabs)/edit-product/[id]', params: { id: product.id } } as any);
                  }}
                >
                  <Image 
                    source={{ uri: product.image_url || product.images?.[0] || 'https://via.placeholder.com/150' }} 
                    className="w-16 h-16 rounded-xl bg-slate-100" 
                  />
                  <View className="ml-4 flex-1">
                    <Text className="font-bold text-slate-800 text-base mb-1" numberOfLines={1}>{product.product_name}</Text>
                    <Text className="text-slate-500 text-xs mb-1" numberOfLines={1}>
                      {category ? category.category_name : 'Uncategorized'}
                    </Text>
                    <Text className="text-[#C1275A] font-extrabold">₹{product.price}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C1275A" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string, icon: any, color: string }) {
  return (
    <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm mb-4 border border-slate-50">
      <View className={`w-10 h-10 rounded-full items-center justify-center mb-3`} style={{ backgroundColor: `${color}15` }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text className="text-2xl font-extrabold text-slate-800">{value}</Text>
      <Text className="text-sm text-slate-500 font-medium mt-1">{title}</Text>
    </View>
  );
}
