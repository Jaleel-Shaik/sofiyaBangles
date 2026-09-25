import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { OrderReview } from "@/src/api/orders";

export default function AdminReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<OrderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "defective" | "5star">("all");

  const fetchReviews = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await api.orders.getAdminReviews();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Failed to load admin reviews:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.user_name?.toLowerCase().includes(q);
        const matchPhone = r.user_phone?.toLowerCase().includes(q);
        const matchEmail = r.user_email?.toLowerCase().includes(q);
        const matchProduct = r.product_name?.toLowerCase().includes(q);
        const matchOrder = r.order_number?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchProduct && !matchOrder) {
          return false;
        }
      }

      if (selectedFilter === "defective") {
        if (!r.is_defective && !r.damage_details) return false;
      } else if (selectedFilter === "5star") {
        if (Number(r.rating) !== 5) return false;
      }

      return true;
    });
  }, [reviews, searchQuery, selectedFilter]);

  const totalCount = reviews.length;
  const avgRating = totalCount > 0
    ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / totalCount).toFixed(1)
    : "0.0";
  const defectCount = reviews.filter((r) => r.is_defective || Boolean(r.damage_details)).length;

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {/* Header */}
      <View
        className="px-5 pb-3 bg-white border-b border-divider"
        style={{ paddingTop: Math.max(insets.top + 8, 36) }}
      >
        <View className="flex-row items-center mb-1">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-50 border border-divider items-center justify-center mr-3"
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">
                  ADMIN FEEDBACK PORTAL
                </Text>
              </View>
            </View>
            <Text className="text-xl font-bold text-slate-900 mt-0.5">
              Customer Reviews ({totalCount})
            </Text>
          </View>
        </View>
        <Text className="text-xs text-slate-500">
          User contact info, quality ratings, suggestions & defect reports
        </Text>
      </View>

      {/* KPI Stats Bar */}
      <View className="flex-row px-5 py-3 gap-2.5 bg-white border-b border-divider">
        <View className="flex-1 p-2.5 bg-purple-50 rounded-xl border border-purple-100 items-center">
          <Text className="text-[10px] font-bold text-purple-700 uppercase">Total</Text>
          <Text className="text-base font-extrabold text-purple-950 mt-0.5">{totalCount}</Text>
        </View>
        <View className="flex-1 p-2.5 bg-amber-50 rounded-xl border border-amber-100 items-center">
          <Text className="text-[10px] font-bold text-amber-700 uppercase">Avg Quality</Text>
          <Text className="text-base font-extrabold text-amber-950 mt-0.5">{avgRating} ★</Text>
        </View>
        <View className="flex-1 p-2.5 bg-rose-50 rounded-xl border border-rose-100 items-center">
          <Text className="text-[10px] font-bold text-rose-700 uppercase">Defective</Text>
          <Text className="text-base font-extrabold text-rose-950 mt-0.5">{defectCount}</Text>
        </View>
      </View>

      {/* Search & Filters */}
      <View className="px-5 pt-3 pb-2 bg-white border-b border-divider">
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-2.5">
          <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name, phone, order #, product..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-xs text-slate-900 p-0"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setSelectedFilter("all")}
            className={`px-3 py-1.5 rounded-full border ${
              selectedFilter === "all"
                ? "bg-slate-900 border-slate-900"
                : "bg-white border-slate-200"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedFilter === "all" ? "text-white" : "text-slate-600"
              }`}
            >
              All ({totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter("defective")}
            className={`px-3 py-1.5 rounded-full border ${
              selectedFilter === "defective"
                ? "bg-rose-600 border-rose-600"
                : "bg-white border-slate-200"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedFilter === "defective" ? "text-white" : "text-rose-700"
              }`}
            >
              ⚠️ Defective ({defectCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter("5star")}
            className={`px-3 py-1.5 rounded-full border ${
              selectedFilter === "5star"
                ? "bg-amber-500 border-amber-500"
                : "bg-white border-slate-200"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedFilter === "5star" ? "text-white" : "text-amber-800"
              }`}
            >
              ★ 5 Stars
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Review List */}
      <ScrollView
        className="flex-1 px-5 pt-3"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchReviews(true)}
            colors={["#e11d48"]}
          />
        }
      >
        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#e11d48" />
          </View>
        ) : filteredReviews.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
            <Text className="text-sm font-bold text-slate-700 mt-3">No reviews found</Text>
            <Text className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or filter.
            </Text>
          </View>
        ) : (
          filteredReviews.map((review) => {
            const hasDefect = review.is_defective || Boolean(review.damage_details);
            const dateStr = review.created_at
              ? new Date(review.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Recent";

            return (
              <View
                key={review.id}
                className="bg-white rounded-2xl p-4 mb-3.5 border border-divider shadow-xs"
              >
                {/* Customer Details Row */}
                <View className="flex-row items-start justify-between border-b border-slate-100 pb-3 mb-3">
                  <View className="flex-row items-center flex-1 pr-2">
                    <View className="w-9 h-9 rounded-full bg-rose-100 items-center justify-center mr-2.5">
                      <Text className="text-xs font-bold text-[#C1275A]">
                        {review.user_name?.charAt(0)?.toUpperCase() || "C"}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                        {review.user_name || "Customer"}
                      </Text>
                      {review.user_phone ? (
                        <TouchableOpacity
                          onPress={() =>
                            Linking.openURL(
                              `https://wa.me/${review.user_phone?.replace(/[^0-9]/g, "")}`
                            )
                          }
                          className="flex-row items-center mt-0.5"
                        >
                          <Ionicons name="logo-whatsapp" size={12} color="#059669" />
                          <Text className="text-xs text-emerald-700 font-bold ml-1">
                            {review.user_phone}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {review.user_email ? (
                        <Text className="text-[11px] text-slate-400 mt-0.5">
                          {review.user_email}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View className="items-end">
                    <View className="bg-slate-100 px-2 py-0.5 rounded">
                      <Text className="text-[10px] font-mono font-bold text-slate-700">
                        {review.order_number ? `#${review.order_number}` : "Order Ref"}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-slate-400 mt-1">{dateStr}</Text>
                  </View>
                </View>

                {/* Product Reference */}
                <View className="flex-row items-center p-2.5 bg-slate-50 rounded-xl mb-3 border border-slate-100">
                  <View className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden mr-2.5">
                    {review.product_image ? (
                      <Image
                        source={{ uri: review.product_image }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center">
                        <Ionicons name="image-outline" size={16} color="#94a3b8" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                      {review.product_name || "Handcrafted Bangles"}
                    </Text>
                  </View>

                  {/* Rating Stars Badge */}
                  <View className="flex-row items-center bg-amber-100/70 px-2.5 py-1 rounded-full">
                    <Ionicons name="star" size={12} color="#d97706" />
                    <Text className="text-xs font-bold text-amber-900 ml-1">
                      {review.rating}/5
                    </Text>
                  </View>
                </View>

                {/* 1. Quality & Review Comments */}
                {review.comment ? (
                  <View className="mb-2">
                    <Text className="text-[11px] text-slate-700 leading-4">
                      <Text className="font-bold">Feedback: </Text>
                      {review.comment}
                    </Text>
                  </View>
                ) : null}

                {/* 2. Customer Suggestions */}
                {review.suggestion ? (
                  <View className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-100 mb-2">
                    <Text className="text-[11px] text-blue-900 leading-4">
                      <Text className="font-bold">💡 Suggestion: </Text>
                      {review.suggestion}
                    </Text>
                  </View>
                ) : null}

                {/* 3. Damage / Defective Alert */}
                {hasDefect && (
                  <View className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 mt-1">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="alert-circle" size={14} color="#e11d48" style={{ marginRight: 4 }} />
                      <Text className="text-xs font-bold text-rose-900">
                        Damage / Defect Reported
                      </Text>
                    </View>
                    <Text className="text-[11px] text-rose-800 leading-4">
                      {review.damage_details || "Product marked as defective by customer upon receipt."}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
