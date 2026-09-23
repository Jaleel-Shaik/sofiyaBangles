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
    tag,
    title,
    subtitle,
    value,
    unit,
    icon,
    color,
    accent,
  }: {
    tag: string;
    title: string;
    subtitle: string;
    value: string;
    unit?: string;
    icon: any;
    color: string;
    accent?: string;
  }) => (
    <View className="w-[48%] bg-surface p-3.5 rounded-2xl mb-3 border border-divider justify-between">
      <View>
        <View className="flex-row items-center justify-between mb-2">
          <View className="px-1.5 py-0.5 rounded bg-slate-100">
            <Text className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">{tag}</Text>
          </View>
          <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Ionicons name={icon} size={15} color={color} />
          </View>
        </View>
        <View className="flex-row items-baseline">
          <Text className="text-xl font-extrabold text-text-primary">{value}</Text>
          {unit && <Text className="text-[11px] text-text-secondary font-semibold ml-1">{unit}</Text>}
        </View>
        <Text className="text-xs text-text-primary font-bold mt-0.5">{title}</Text>
        <Text className="text-[10px] text-text-secondary font-normal mt-0.5" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {accent && (
        <View className="mt-2 pt-1.5 border-t border-divider/60 flex-row items-center justify-between">
          <Text className="text-[9px] font-bold text-primary">{accent}</Text>
          <Ionicons name="arrow-forward" size={10} color="#e11d48" />
        </View>
      )}
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
        {/* Header with explicit role badge and context */}
        <View
          className="px-5 pb-5 bg-primary/5"
          style={{ paddingTop: Math.max(insets.top + 16, 40) }}
        >
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center flex-wrap gap-1.5 mb-1">
                <View className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  <Text className="text-primary font-extrabold text-[10px] uppercase tracking-wider">
                    {user?.role === 'super_admin' ? 'ROLE: SUPER ADMIN (MOBILE)' : 'ROLE: STORE OPERATIONS ADMIN'}
                  </Text>
                </View>
                {user?.role === 'super_admin' && (
                  <View className="bg-rose-600 px-2 py-0.5 rounded-full">
                    <Text className="text-[9px] font-bold text-white">70/30 Ledger Active</Text>
                  </View>
                )}
              </View>
              <Text className="text-xl font-bold text-text-primary" numberOfLines={1}>
                Welcome, {user?.full_name?.split(' ')[0] || 'Admin'}
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5">
                Live store operations, physical stock count & WhatsApp sales
              </Text>
            </View>
            <View className="flex-row items-center mt-1">
              <TouchableOpacity
                onPress={() => router.push('/(admin)/(tabs)/products' as any)}
                className="w-10 h-10 rounded-full bg-surface border border-primary/20 items-center justify-center mr-2.5"
              >
                <Ionicons name="bag-outline" size={19} color="#e11d48" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(admin)/(tabs)/settings' as any)}>
                {user?.avatar_url ? (
                  <Image
                    source={{ uri: user.avatar_url }}
                    className="w-10 h-10 rounded-full border-2 border-surface"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full border-2 border-surface bg-surface items-center justify-center">
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

        <View className="px-4 pt-5">
          {/* Quick Sell Action Card with explicit labels */}
          <TouchableOpacity
            onPress={() => router.push('/(admin)/quick-sell')}
            activeOpacity={0.9}
            className="mb-5 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-xl bg-amber-400/20 items-center justify-center mr-3">
                <Ionicons name="flash" size={22} color="#fbbf24" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5 mb-0.5">
                  <Text className="text-white font-extrabold text-sm">Instant Sale by Product Code</Text>
                  <View className="bg-amber-400/20 px-1.5 py-0.2 rounded">
                    <Text className="text-[9px] font-bold text-amber-300">Fast</Text>
                  </View>
                </View>
                <Text className="text-slate-400 text-xs">
                  Enter product code (e.g. BAN-1006) to fulfill WhatsApp orders & decrement stock
                </Text>
              </View>
            </View>
            <View className="bg-primary px-3.5 py-2 rounded-xl">
              <Text className="text-white font-bold text-xs">Sell Now</Text>
            </View>
          </TouchableOpacity>

          {/* Overview Header with subtitle */}
          <View className="mb-3">
            <Text className="text-base font-bold text-text-primary">Store Inventory & Sales Performance</Text>
            <Text className="text-xs text-text-secondary mt-0.5">
              Live metrics synchronized with backend database
            </Text>
          </View>

          {/* 4 Balanced Stat Cards with Category Tags, Units & Subtitles */}
          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#e11d48" />
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between mb-5">
              <StatCard
                tag="CATALOG"
                title="Total Designs"
                subtitle="Active bangle models registered in store showcase"
                value={stats?.totalProducts?.toString() || "0"}
                unit="designs"
                icon="cube-outline"
                color="#3b82f6"
                accent="Manage Catalog"
              />
              <StatCard
                tag="INVENTORY"
                title="Physical Stock"
                subtitle="Units available across all sizes (2.4, 2.6, 2.8)"
                value={stats?.totalStock?.toString() || "0"}
                unit="units"
                icon="layers-outline"
                color="#10b981"
                accent="Live In Stock"
              />
              <StatCard
                tag="SALES"
                title="Units Sold"
                subtitle="Completed units bought via WhatsApp & store orders"
                value={stats?.itemsSold?.toString() || "0"}
                unit="sold"
                icon="bag-check-outline"
                color="#f59e0b"
                accent="Completed"
              />
              <StatCard
                tag="ORDERS"
                title="WhatsApp Orders"
                subtitle="Total customer purchase orders recorded in system"
                value={stats?.totalOrders?.toString() || "0"}
                unit="orders"
                icon="chatbubble-ellipses-outline"
                color="#8b5cf6"
                accent="View Bills"
              />
            </View>
          )}

          {/* Quick Actions Header & Buttons */}
          <View className="mb-3">
            <Text className="text-base font-bold text-text-primary">Store Management Actions</Text>
            <Text className="text-xs text-text-secondary mt-0.5">
              Shortcuts for product catalog, collections, and bangle models
            </Text>
          </View>

          <View className="flex-row mb-3">
            <TouchableOpacity
              className="flex-1 bg-primary p-3.5 rounded-2xl items-center mr-2 shadow-xs"
              onPress={() => router.push('/(admin)/(tabs)/add' as any)}
            >
              <Ionicons name="add-circle-outline" size={22} color="white" />
              <Text className="text-white font-bold text-xs mt-1.5">Add Product</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-surface p-3.5 rounded-2xl items-center border border-divider ml-2"
              onPress={() => router.push('/(admin)/(tabs)/products' as any)}
            >
              <Ionicons name="cube-outline" size={22} color="#e11d48" />
              <Text className="text-primary font-bold text-xs mt-1.5">Manage Catalog</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row mb-6">
            <TouchableOpacity
              className="flex-1 bg-surface p-3.5 rounded-2xl items-center border border-divider mr-2"
              onPress={() => router.push('/(admin)/(tabs)/categories')}
            >
              <Ionicons name="folder-open-outline" size={22} color="#f59e0b" />
              <Text className="text-text-primary font-bold text-xs mt-1.5">{STRINGS.admin.quickActions.collections}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-surface p-3.5 rounded-2xl items-center border border-divider ml-2"
              onPress={() => router.push('/(admin)/(tabs)/manage-model-types' as any)}
            >
              <Ionicons name="layers-outline" size={22} color="#8b5cf6" />
              <Text className="text-text-primary font-bold text-xs mt-1.5">Model Types</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Products Header */}
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-base font-bold text-text-primary">Recent Catalog Products</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/(tabs)/products' as any)}>
              <Text className="text-primary font-semibold text-xs">See All Catalog →</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-text-secondary mb-3">
            Review design names, unique codes, retail pricing, and stock status
          </Text>

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
                    className="bg-surface p-3 rounded-2xl flex-row items-center mb-3 border border-divider"
                    activeOpacity={0.9}
                    onPress={() => {
                      router.push({ pathname: '/(admin)/(tabs)/product-detail/[id]', params: { id: product.id } });
                    }}
                  >
                    <Image
                      source={{ uri: product.image_url || product.images?.[0] || 'https://via.placeholder.com/150' }}
                      className="w-24 h-24 rounded-xl bg-surface"
                    />
                    <View className="ml-3.5 flex-1 justify-center">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Design Name
                      </Text>
                      <Text className="font-bold text-text-primary text-sm mb-1" numberOfLines={1}>
                        {product.product_name}
                      </Text>

                      <View className="flex-row items-center mb-1">
                        <Text className="text-[10px] text-text-secondary font-medium">Code: </Text>
                        <Text className="text-[11px] font-mono font-bold text-slate-800">
                          {product.unique_code || `BAN-${product.id.slice(-4).toUpperCase()}`}
                        </Text>
                      </View>

                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-[9px] text-text-secondary font-medium">Retail Price</Text>
                          <Text className="text-[#C25B3E] font-extrabold text-sm">₹{product.price}</Text>
                        </View>
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
                      className="bg-slate-900 px-3 py-2 rounded-xl flex-row items-center ml-2 shadow-xs"
                      activeOpacity={0.8}
                    >
                      <Ionicons name="flash" size={12} color="#fbbf24" />
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
