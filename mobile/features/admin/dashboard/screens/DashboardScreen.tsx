import type { Product } from '@/src/api/products';
import { api } from "@/src/api";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';

import { useAuthStore } from '@/src/store/authStore';
import { getCachedApiBaseUrl } from '@/src/api/config';
import { STRINGS } from '@/src/constants/strings';

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [connectionError, setConnectionError] = useState(false);

  const fetchData = async () => {
    setConnectionError(false);
    try {
      const results = await Promise.allSettled([
        api.admin.getOverviewAnalytics(),
        api.admin.getAdminProducts(1, 5),
      ]);

      const [statsRes, productsRes] = results;
      let anySucceeded = false;

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
        anySucceeded = true;
      } else {
        console.warn("Dashboard stats fetch issue:", statsRes.reason);
      }

      if (productsRes.status === 'fulfilled') {
        setRecentProducts(productsRes.value.products || []);
        anySucceeded = true;
      } else {
        console.warn("Dashboard products fetch issue:", productsRes.reason);
      }

      if (!anySucceeded) {
        setConnectionError(true);
      }
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

  const StatCard = ({
    title,
    value,
    icon,
    color,
    onPress,
  }: {
    title: string;
    value: string;
    icon: any;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      className="w-[48%] bg-surface p-4 rounded-2xl mb-3 border border-divider justify-between shadow-xs"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {onPress && (
          <Ionicons name="arrow-forward" size={14} color="#94a3b8" />
        )}
      </View>
      <View>
        <Text className="text-2xl font-black text-text-primary tracking-tight">{value}</Text>
        <Text className="text-xs text-text-secondary font-semibold mt-1">{title}</Text>
      </View>
    </TouchableOpacity>
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
          className="px-5 pb-4 bg-primary/5 border-b border-divider/40"
          style={{ paddingTop: Math.max(insets.top + 12, 36) }}
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <View className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  <Text className="text-primary font-bold text-[10px] uppercase tracking-wider">
                    {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </Text>
                </View>
              </View>
              <Text className="text-2xl font-black text-text-primary" numberOfLines={1}>
                Welcome, {user?.full_name?.split(' ')[0] || 'Admin'}
              </Text>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => router.push('/(admin)/(tabs)/products' as any)}
                className="w-10 h-10 rounded-full bg-surface border border-divider items-center justify-center mr-2 shadow-xs"
                accessibilityLabel="View Products"
              >
                <Ionicons name="bag-outline" size={19} color="#e11d48" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(admin)/(tabs)/settings' as any)}
                accessibilityLabel="Settings"
              >
                {user?.avatar_url ? (
                  <Image
                    source={{ uri: user.avatar_url }}
                    className="w-10 h-10 rounded-full border border-divider"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full border border-divider bg-surface items-center justify-center">
                    <Ionicons name="person" size={20} color="#cbd5e1" />
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

        <View className="px-4 pt-4">
          {/* Quick Sell Action Card */}
          <TouchableOpacity
            onPress={() => router.push('/(admin)/quick-sell')}
            activeOpacity={0.85}
            className="mb-5 p-4 rounded-3xl bg-primary border border-rose-400/40 shadow-md shadow-rose-500/25 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 items-center justify-center mr-3 shadow-xs">
                <Ionicons name="sparkles" size={20} color="#fbbf24" />
              </View>
              <View>
                <View className="flex-row items-center">
                  <Ionicons name="flash" size={11} color="#fbbf24" />
                  <Text className="text-white/90 text-[10px] uppercase font-bold tracking-wider ml-1">
                    Direct Billing
                  </Text>
                </View>
                <Text className="text-white font-bold text-base">Quick Sell Counter</Text>
                <Text className="text-rose-100 text-xs mt-0.5">Instant WhatsApp Order Sale</Text>
              </View>
            </View>
            <View className="bg-white px-3.5 py-2 rounded-xl flex-row items-center shadow-xs">
              <Text className="text-rose-600 font-bold text-xs mr-1">Sell Now</Text>
              <Ionicons name="arrow-forward" size={12} color="#e11d48" />
            </View>
          </TouchableOpacity>

          {/* Overview Header */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-text-primary">Overview</Text>
          </View>

          {/* Stat Cards */}
          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#e11d48" />
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between mb-5">
              <StatCard
                title="Total Products"
                value={stats?.totalProducts?.toString() || "0"}
                icon="cube-outline"
                color="#3b82f6"
                onPress={() => router.push('/(admin)/(tabs)/products' as any)}
              />
              <StatCard
                title="Total Stock"
                value={stats?.totalStock?.toString() || "0"}
                icon="layers-outline"
                color="#10b981"
                onPress={() => router.push('/(admin)/(tabs)/products' as any)}
              />
              <StatCard
                title="Units Sold"
                value={stats?.itemsSold?.toString() || "0"}
                icon="bag-check-outline"
                color="#f59e0b"
              />
              <StatCard
                title="Orders"
                value={stats?.totalOrders?.toString() || "0"}
                icon="chatbubble-ellipses-outline"
                color="#8b5cf6"
              />
            </View>
          )}

          {/* Quick Actions Header & Buttons */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-text-primary">Quick Actions</Text>
          </View>

          <View className="flex-row mb-3">
            <TouchableOpacity
              className="flex-1 bg-primary p-3.5 rounded-2xl items-center mr-2 shadow-xs flex-row justify-center"
              onPress={() => router.push('/(admin)/(tabs)/add' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text className="text-white font-bold text-xs ml-1.5">Add Product</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-surface p-3.5 rounded-2xl items-center border border-divider ml-2 flex-row justify-center"
              onPress={() => router.push('/(admin)/(tabs)/products' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="cube-outline" size={20} color="#e11d48" />
              <Text className="text-primary font-bold text-xs ml-1.5">Products</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row mb-5">
            <TouchableOpacity
              className="flex-1 bg-surface p-3.5 rounded-2xl items-center border border-divider mr-2 flex-row justify-center"
              onPress={() => router.push('/(admin)/(tabs)/categories')}
              activeOpacity={0.8}
            >
              <Ionicons name="folder-open-outline" size={20} color="#f59e0b" />
              <Text className="text-text-primary font-bold text-xs ml-1.5">{STRINGS.admin.quickActions.collections}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-surface p-3.5 rounded-2xl items-center border border-divider ml-2 flex-row justify-center"
              onPress={() => router.push('/(admin)/(tabs)/manage-model-types' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="layers-outline" size={20} color="#8b5cf6" />
              <Text className="text-text-primary font-bold text-xs ml-1.5">Model Types</Text>
            </TouchableOpacity>
          </View>

          {/* Customer Reviews & Ratings Action Card */}
          <TouchableOpacity
            className="bg-surface border border-divider p-3.5 rounded-2xl flex-row items-center justify-between mb-6 shadow-xs"
            activeOpacity={0.8}
            onPress={() => router.push('/(admin)/reviews' as any)}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-xl bg-amber-500/15 items-center justify-center mr-3">
                <Ionicons name="star" size={20} color="#d97706" />
              </View>
              <View>
                <Text className="text-sm font-bold text-text-primary">Customer Reviews</Text>
                <Text className="text-xs text-text-secondary mt-0.5">Ratings & Feedback</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Recent Products Header */}
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-bold text-text-primary">Recent Products</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/(tabs)/products' as any)}>
              <Text className="text-primary font-semibold text-xs">See All →</Text>
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
              {(recentProducts || []).slice(0, 5).map((product) => {
                return (
                  <TouchableOpacity
                    key={product.id}
                    className="bg-surface p-3 rounded-2xl flex-row items-center mb-3 border border-divider shadow-xs"
                    activeOpacity={0.9}
                    onPress={() => {
                      router.push({ pathname: '/(admin)/(tabs)/product-detail/[id]', params: { id: product.id } });
                    }}
                  >
                    <Image
                      source={{ uri: product.image_url || product.images?.[0] || 'https://via.placeholder.com/150' }}
                      className="w-20 h-20 rounded-xl bg-surface"
                    />
                    <View className="ml-3.5 flex-1 justify-center">
                      <Text className="font-bold text-text-primary text-sm mb-1" numberOfLines={1}>
                        {product.product_name}
                      </Text>

                      <View className="flex-row items-center mb-1.5">
                        <Text className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {product.unique_code || `BAN-${product.id.slice(-4).toUpperCase()}`}
                        </Text>
                      </View>

                      <View className="flex-row items-center justify-between">
                        <Text className="text-[#C25B3E] font-extrabold text-sm">₹{product.price}</Text>
                        <View className={`px-2 py-0.5 rounded-md ${(product.quantity || 0) > 0 ? 'bg-success/10' : 'bg-error/10'}`}>
                          <Text className={`text-[10px] font-bold ${(product.quantity || 0) > 0 ? 'text-success' : 'text-error'}`}>
                            {(product.quantity || 0) > 0 ? `${product.quantity} in stock` : 'Out of stock'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push({
                          pathname: '/(admin)/quick-sell',
                          params: { code: product.unique_code || product.id, id: product.id },
                        });
                      }}
                      className="bg-primary px-3 py-2 rounded-xl flex-row items-center ml-2 shadow-xs"
                      activeOpacity={0.8}
                    >
                      <Ionicons name="sparkles" size={12} color="#ffffff" />
                      <Text className="text-white font-bold text-xs ml-1">Sell</Text>
                    </TouchableOpacity>
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
