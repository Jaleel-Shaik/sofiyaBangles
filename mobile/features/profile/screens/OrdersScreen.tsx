import type { Order, OrderItem } from '@/src/api/orders';
import { api } from "@/src/api";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await api.orders.getUserOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Failed to fetch orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const openOrderProduct = (order: OrderItem) => {
    if (!order?.product_id) return;
    router.push({
      pathname: "/products/[id]",
      params: { id: order.product_id, fromOrders: "true", orderId: order.id },
    } as any);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  const safeOrders = Array.isArray(orders) ? orders : [];

  return (
    <View className="flex-1 bg-background">
      <View
        className="px-5 pb-4 bg-surface border-b border-divider flex-row items-center justify-between"
        style={{ paddingTop: Math.max(insets.top + 8, 36) }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-11 h-11 rounded-full bg-slate-50 border border-divider items-center justify-center mr-3"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text-primary flex-1">My Orders</Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#e11d48"]} />
        }
      >
        {safeOrders.length === 0 ? (
          <View className="items-center justify-center pt-20">
            <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-4">
              <Ionicons name="bag-outline" size={36} color="#e11d48" />
            </View>
            <Text className="text-lg font-bold text-text-primary mb-2">No purchases yet</Text>
            <Text className="text-sm text-text-secondary text-center max-w-[260px] mb-6">
              Browse products and mark them as bought to see them here.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/home" as any)}
              className="bg-[#111827] px-6 py-3.5 rounded-2xl min-h-[44px] items-center justify-center"
              accessibilityRole="button"
            >
              <Text className="text-white font-bold text-sm">Browse Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          safeOrders.flatMap((order) => (order?.items || []).map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => openOrderProduct(item)}
              activeOpacity={0.7}
              className="bg-surface rounded-2xl mb-4 border border-divider overflow-hidden"
            >
              <View className="flex-row p-4">
                <View className="w-24 h-24 rounded-xl bg-slate-50 overflow-hidden mr-4">
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <Ionicons name="image-outline" size={24} color="#cbd5e1" />
                    </View>
                  )}
                </View>

                <View className="flex-1 justify-center">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-base font-bold text-text-primary" numberOfLines={1}>
                        {item.product_name}
                      </Text>
                      <Text className="text-lg font-bold text-[#C25B3E] mt-0.5">₹{item.price}</Text>
                    </View>
                    <View className="bg-success/10 px-2 py-1 rounded-full">
                      <Text className="text-success text-xs font-bold">Bought</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-text-hint mt-1">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
                    }) : ''}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center mx-4 mb-4 px-4 py-3 rounded-2xl bg-slate-50 border border-divider">
                <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${item.is_reviewed ? "bg-success/20" : "bg-warning/20"}`}>
                  <Ionicons name={item.is_reviewed ? "star" : "star-outline"} size={16} color={item.is_reviewed ? "#059669" : "#d97706"} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-text-primary">{item.is_reviewed ? "Reviewed" : "Tap to rate"}</Text>
                  <Text className="text-xs text-text-secondary mt-0.5">
                    {item.is_reviewed ? "Your feedback has been saved" : "Share your experience"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          )))
        )}
      </ScrollView>
    </View>
  );
}
