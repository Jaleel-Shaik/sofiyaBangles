import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { getOverviewAnalytics, getAdminProducts } from '@/src/api/admin';
import { getCategories, Category } from '@/src/api/categories';
import { Product } from '@/src/api/products';
import { useAuthStore } from '@/src/store/authStore';
import { getCachedApiBaseUrl } from '@/src/api/config';

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [connectionError, setConnectionError] = useState(false);

  const fetchData = async () => {
    setConnectionError(false);
    try {
      const [data, productsData, cats] = await Promise.all([
        getOverviewAnalytics(),
        getAdminProducts(1, 5),
        getCategories()
      ]);
      setStats(data);
      setRecentProducts(productsData.products);
      setCategories(cats);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
      setConnectionError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const StatCard = ({ title, value, icon, color, accent }: { title: string, value: string, icon: any, color: string, accent?: string }) => (
    <View className="w-[48%] bg-surface p-4 rounded-2xl mb-3 border border-divider">
      <View className="flex-row items-center justify-between mb-3">
        <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {accent && (
          <View className="bg-primary/10 px-2 py-0.5 rounded-full">
            <Text className="text-[10px] font-bold text-primary">{accent}</Text>
          </View>
        )}
      </View>
      <Text className="text-2xl font-bold text-text-primary">{value}</Text>
      <Text className="text-xs text-text-secondary font-medium mt-1">{title}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#e11d48"]} />
        }
      >
        {/* Header */}
        <View
          className="px-5 pb-6 bg-primary/5"
          style={{ paddingTop: Math.max(insets.top + 16, 40) }}
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-primary font-medium text-xs uppercase tracking-wider mb-0.5">Admin Panel</Text>
              <Text className="text-xl font-bold text-text-primary mt-0.5" numberOfLines={1}>
                Welcome, {user?.full_name?.split(' ')[0] || 'Admin'}
              </Text>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => router.push('/(admin)/(tabs)/products' as any)}
                className="w-10 h-10 rounded-full bg-surface border border-primary/20 items-center justify-center mr-3"
              >
                <Ionicons name="bag-outline" size={20} color="#e11d48" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(admin)/(tabs)/settings' as any)}>
                {user?.avatar_url ? (
                  <Image
                    source={{ uri: user.avatar_url }}
                    className="w-10 h-10 rounded-full border-2 border-surface"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full border-2 border-surface bg-surface items-center justify-center">
                    <Ionicons name="person" size={22} color="#cbd5e1" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {connectionError && (
          <View className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex-row items-center">
            <Ionicons name="cloud-offline-outline" size={24} color="#dc2626" />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-red-700">Server Unreachable</Text>
              <Text className="text-xs text-red-600 mt-0.5">
                Cannot connect to API at {getCachedApiBaseUrl()}. Make sure the backend server is running. Pull down to retry.
              </Text>
            </View>
          </View>
        )}

        <View className="px-4 pt-5">
          {/* Stats */}
          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#e11d48" />
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between mb-6">
              <StatCard
                title="Total Products"
                value={stats?.totalProducts?.toString() || "0"}
                icon="cube-outline"
                color="#3b82f6"
              />
              <StatCard
                title="Sold Products"
                value={stats?.itemsSold?.toString() || "0"}
                icon="bag-check-outline"
                color="#f59e0b"
                accent="Sold"
              />
            </View>
          )}

          {/* Quick Actions */}
          <Text className="text-base font-bold text-text-primary mb-4">Quick Actions</Text>
          <View className="flex-row mb-3">
            <TouchableOpacity
              className="flex-1 bg-primary p-4 rounded-2xl items-center mr-2"
              onPress={() => router.push('/(admin)/(tabs)/add' as any)}
            >
              <Ionicons name="add-circle-outline" size={24} color="white" />
              <Text className="text-white font-bold mt-2">Add Product</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-surface p-4 rounded-2xl items-center border border-divider ml-2"
              onPress={() => router.push('/(admin)/(tabs)/products' as any)}
            >
              <Ionicons name="cube-outline" size={24} color="#e11d48" />
              <Text className="text-primary font-bold mt-2">Manage</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row mb-6">
            <TouchableOpacity
              className="flex-1 bg-surface p-4 rounded-2xl items-center border border-divider mr-2"
              onPress={() => router.push('/(admin)/(tabs)/categories' as any)}
            >
              <Ionicons name="folder-open-outline" size={24} color="#f59e0b" />
              <Text className="text-text-primary font-bold mt-2">Categories</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-surface p-4 rounded-2xl items-center border border-divider ml-2"
              onPress={() => router.push('/(admin)/(tabs)/manage-model-types' as any)}
            >
              <Ionicons name="layers-outline" size={24} color="#8b5cf6" />
              <Text className="text-text-primary font-bold mt-2">Model Types</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Products */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-bold text-text-primary">Recent Products</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/(tabs)/products' as any)}>
              <Text className="text-primary font-semibold text-sm">See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#e11d48" />
            </View>
          ) : recentProducts.length === 0 ? (
            <View className="bg-surface rounded-2xl border border-divider p-10 items-center mb-8">
              <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
              <Text className="text-text-secondary font-medium mt-4">No products yet.</Text>
              <TouchableOpacity
                className="bg-primary px-6 py-3 rounded-full mt-4"
                onPress={() => router.push('/(admin)/(tabs)/add' as any)}
              >
                <Text className="text-white font-bold">Add Your First Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mb-8">
              {recentProducts.slice(0, 5).map((product) => {
                return (
                  <TouchableOpacity
                    key={product.id}
                    className="bg-surface p-3 rounded-2xl flex-row items-center mb-3 border border-divider"
                    activeOpacity={0.9}
                    onPress={() => {
                      router.push({ pathname: '/(admin)/(tabs)/product-detail/[id]', params: { id: product.id } } as any);
                    }}
                  >
                    <Image
                      source={{ uri: product.image_url || product.images?.[0] || 'https://via.placeholder.com/150' }}
                      className="w-28 h-28 rounded-xl bg-surface"
                    />
                    <View className="ml-4 flex-1">
                      <Text className="font-bold text-text-primary text-base mb-1" numberOfLines={1}>{product.product_name}</Text>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[#C25B3E] font-bold">₹{product.price}</Text>
                        <View className={`px-2 py-1 rounded-md ${(product.quantity || 0) > 0 ? 'bg-success/10' : 'bg-error/10'}`}>
                          <Text className={`text-[10px] font-bold ${(product.quantity || 0) > 0 ? 'text-success' : 'text-error'}`}>
                            {(product.quantity || 0) > 0 ? `${product.quantity} in stock` : 'Out of stock'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#e11d48" style={{ marginLeft: 8 }} />
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
