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
  AppState,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async (silent = false) => {
    try {
      const data = await api.orders.getUserOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      if (!silent) {
        console.warn("Failed to fetch orders:", error);
      }
      if (!silent && orders.length === 0) {
        setOrders([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch orders whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  // Layer 1 Sync: Re-sync immediately when customer returns from WhatsApp / switches back to app
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchOrders(true);
      }
    });
    return () => subscription.remove();
  }, []);

  // Layer 2 Sync: Smart Polling while any order is "pending" (awaiting admin fulfillment on web or mobile)
  useEffect(() => {
    const hasPending = orders.some((order) => order.status === "pending");
    if (!hasPending) return;

    const intervalId = setInterval(() => {
      fetchOrders(true);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [orders]);

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
        className="px-5 pb-3 bg-surface border-b border-divider"
        style={{ paddingTop: Math.max(insets.top + 8, 36) }}
      >
        <View className="flex-row items-center mb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-50 border border-divider items-center justify-center mr-3"
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                  ROLE: CUSTOMER ORDERS
                </Text>
              </View>
            </View>
            <Text className="text-xl font-bold text-text-primary mt-0.5">My Purchases</Text>
          </View>
        </View>
        <Text className="text-xs text-text-secondary">
          Track WhatsApp orders, live confirmation status & purchase history
        </Text>
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
              Browse products and purchase them to track your orders here.
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
          safeOrders.flatMap((order) => (order?.items || []).map((item) => {
            const isCompleted = order.status === "completed";
            const isPending = order.status === "pending";
            const isCancelled = order.status === "cancelled";

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => openOrderProduct(item)}
                activeOpacity={0.7}
                className="bg-surface rounded-2xl mb-4 border border-divider overflow-hidden shadow-xs"
              >
                <View className="flex-row p-4">
                  <View className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden mr-3.5">
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center bg-slate-100">
                        <Ionicons name="image-outline" size={28} color="#94a3b8" />
                      </View>
                    )}
                  </View>

                  <View className="flex-1 justify-center">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Design Name
                        </Text>
                        <Text className="text-sm font-bold text-text-primary mb-1" numberOfLines={1}>
                          {item.product_name || "Handcrafted Bangles"}
                        </Text>

                        <View className="flex-row items-center mb-1">
                          <Text className="text-[10px] text-text-secondary font-medium">Order #: </Text>
                          <Text className="text-[11px] font-mono font-bold text-slate-800">
                            {order.order_number || "ORD-N/A"}
                          </Text>
                        </View>

                        <View className="flex-row items-baseline">
                          <Text className="text-[10px] text-text-secondary font-medium mr-1">Price: </Text>
                          <Text className="text-base font-extrabold text-[#C25B3E]">
                            ₹{item.price ?? 0}
                          </Text>
                        </View>
                      </View>

                      {isCompleted ? (
                        <View className="bg-success/10 px-2.5 py-1 rounded-full">
                          <Text className="text-success text-xs font-bold">Bought</Text>
                        </View>
                      ) : isCancelled ? (
                        <View className="bg-rose-500/10 px-2.5 py-1 rounded-full">
                          <Text className="text-rose-600 text-xs font-bold">Cancelled</Text>
                        </View>
                      ) : (
                        <View className="bg-amber-500/15 px-2.5 py-1 rounded-full flex-row items-center">
                          <Ionicons name="time" size={11} color="#d97706" style={{ marginRight: 3 }} />
                          <Text className="text-amber-700 text-xs font-bold">Pending</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-row items-center mt-1.5">
                      <Text className="text-[10px] text-text-secondary font-medium">Order Date: </Text>
                      <Text className="text-[10px] text-text-hint font-medium">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
                        }) : 'Recent'}
                      </Text>
                    </View>
                  </View>
                </View>

                {isPending ? (
                  <View className="flex-row items-center mx-4 mb-4 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200/70">
                    <View className="w-8 h-8 rounded-full items-center justify-center mr-3 bg-amber-100">
                      <Ionicons name="logo-whatsapp" size={17} color="#d97706" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-amber-900">Sent to WhatsApp</Text>
                      <Text className="text-[11px] text-amber-700 mt-0.5">
                        Awaiting admin confirmation. This screen updates live when confirmed.
                      </Text>
                    </View>
                  </View>
                ) : (
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
                )}
              </TouchableOpacity>
            );
          }))
        )}
      </ScrollView>
    </View>
  );
}
