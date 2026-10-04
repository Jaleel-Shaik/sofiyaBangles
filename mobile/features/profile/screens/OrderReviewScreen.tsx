import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { useOrderStore } from "@/src/store/orderStore";
import { StarRating } from "@/src/components/StarRating";

const QUALITY_LABELS: Record<number, { label: string; desc: string; color: string }> = {
  5: { label: "Excellent Quality", desc: "Premium finish, flawless design, highly recommended!", color: "#059669" },
  4: { label: "Very Good Quality", desc: "High quality craftsmanship, looks great in hand.", color: "#10b981" },
  3: { label: "Average Quality", desc: "Meets basic expectations.", color: "#d97706" },
  2: { label: "Below Average", desc: "Quality could be improved.", color: "#f97316" },
  1: { label: "Poor Quality", desc: "Not satisfied with product quality.", color: "#e11d48" },
};

export interface OrderReviewParams {
  orderId?: string;
  orderNumber?: string;
  itemId?: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  price?: string;
  size?: string;
}

export default function OrderReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    orderId?: string;
    orderNumber?: string;
    itemId?: string;
    productId?: string;
    productName?: string;
    productImage?: string;
    price?: string;
    size?: string;
  }>();

  // Standard React state for UI updates only
  const [qualityRating, setQualityRating] = useState<number>(5);
  const [isDefective, setIsDefective] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Standard React refs for text inputs:
  // Prevents re-rendering the entire page on every keystroke, eliminating input lag
  // and ensuring 0 extra page calls while typing.
  const suggestionRef = useRef<string>("");
  const damageDetailsRef = useRef<string>("");
  const commentRef = useRef<string>("");

  const handleRatingChange = useCallback((star: number) => {
    setQualityRating(star);
  }, []);

  const handleToggleDefective = useCallback((val: boolean) => {
    setIsDefective(val);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (!params.productId) {
      Alert.alert("Error", "Product identifier is missing.");
      return;
    }

    const suggestion = suggestionRef.current.trim();
    const damageDetails = damageDetailsRef.current.trim();
    const comment = commentRef.current.trim();

    if (isDefective && !damageDetails) {
      Alert.alert(
        "Defect Details Required",
        "Please describe the defect or damage noticed so our team can resolve it."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await api.orders.createReview({
        productId: params.productId,
        orderId: params.orderId || null,
        orderItemId: params.itemId || null,
        rating: qualityRating,
        suggestion: suggestion || null,
        isDefective,
        damageDetails: isDefective ? damageDetails : null,
        comment: comment || null,
      });

      if (params.itemId) {
        useOrderStore.getState().markItemReviewedInStore(params.itemId);
      }

      Alert.alert(
        "Review Submitted!",
        "Thank you for rating your purchase. Your feedback helps us improve and guides other shoppers.",
        [
          {
            text: "Back to Orders",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      const msg =
        error?.response?.data?.error?.message ||
        error?.message ||
        "Failed to submit review.";
      Alert.alert("Submission Error", msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [params.productId, params.orderId, params.itemId, qualityRating, isDefective, router]);

  const currentQuality = QUALITY_LABELS[qualityRating] || QUALITY_LABELS[5];

  const scrollContent = (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Math.max(insets.bottom + 120, 140),
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={true}
      bounces={true}
    >
      {/* Product Snapshot Card */}
      <View className="flex-row bg-white p-3.5 rounded-2xl border border-divider shadow-xs mb-4 items-center">
        <View className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden mr-3.5 border border-slate-200">
          {params.productImage ? (
            <Image
              source={{ uri: params.productImage }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Ionicons name="image-outline" size={24} color="#94a3b8" />
            </View>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
            {params.productName || "Handcrafted Bangles"}
          </Text>
          {params.size ? (
            <Text className="text-xs text-slate-500 mt-0.5">Size: {params.size}</Text>
          ) : null}
          {params.price ? (
            <Text className="text-sm font-extrabold text-[#C25B3E] mt-1">₹{params.price}</Text>
          ) : null}
        </View>
      </View>

      {/* 1. Product Quality Section */}
      <View className="bg-white p-4 rounded-2xl border border-divider shadow-xs mb-4">
        <View className="flex-row items-center mb-1">
          <View className="w-7 h-7 rounded-full bg-amber-100 items-center justify-center mr-2.5">
            <Ionicons name="star" size={16} color="#d97706" />
          </View>
          <Text className="text-base font-bold text-slate-900">1. Product Quality</Text>
        </View>
        <Text className="text-xs text-slate-500 mb-3.5">
          How satisfied are you with the quality, design, and finish of this bangle?
        </Text>

        <View className="items-center py-2">
          <StarRating
            rating={qualityRating}
            maxStars={5}
            size={34}
            interactive
            onChange={handleRatingChange}
            showText={false}
          />
        </View>

        <View className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 items-center">
          <Text className="text-xs font-bold" style={{ color: currentQuality.color }}>
            {qualityRating}/5 — {currentQuality.label}
          </Text>
          <Text className="text-[11px] text-slate-500 text-center mt-0.5">
            {currentQuality.desc}
          </Text>
        </View>
      </View>

      {/* 2. Any Suggestions Section */}
      <View className="bg-white p-4 rounded-2xl border border-divider shadow-xs mb-4">
        <View className="flex-row items-center mb-1">
          <View className="w-7 h-7 rounded-full bg-blue-100 items-center justify-center mr-2.5">
            <Ionicons name="bulb-outline" size={16} color="#2563eb" />
          </View>
          <Text className="text-base font-bold text-slate-900">2. Any Suggestions</Text>
        </View>
        <Text className="text-xs text-slate-500 mb-3">
          Have any ideas to make our bangles, sizes, packaging, or delivery better?
        </Text>
        <TextInput
          defaultValue={suggestionRef.current}
          onChangeText={(text) => {
            suggestionRef.current = text;
          }}
          placeholder="e.g. Would love more pastel colors or magnetic clasps..."
          placeholderTextColor="#94a3b8"
          multiline
          scrollEnabled={false}
          numberOfLines={3}
          textAlignVertical="top"
          className="border border-slate-200 rounded-xl p-3 text-sm text-slate-800 bg-slate-50/50 min-h-[80px]"
        />
      </View>

      {/* 3. Damage or Defective Section */}
      <View className="bg-white p-4 rounded-2xl border border-divider shadow-xs mb-4">
        <View className="flex-row items-center mb-1">
          <View className="w-7 h-7 rounded-full bg-rose-100 items-center justify-center mr-2.5">
            <Ionicons name="shield-checkmark-outline" size={16} color="#e11d48" />
          </View>
          <Text className="text-base font-bold text-slate-900">3. Damage or Defective</Text>
        </View>
        <Text className="text-xs text-slate-500 mb-3">
          Did the item arrive damaged, defective, or in perfect condition?
        </Text>

        <View className="flex-row gap-2.5 mb-3">
          <TouchableOpacity
            onPress={() => handleToggleDefective(false)}
            activeOpacity={0.8}
            className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 min-h-[44px] ${
              !isDefective ? "bg-emerald-50 border-emerald-500" : "bg-slate-50 border-slate-200"
            }`}
          >
            <Ionicons
              name={!isDefective ? "checkmark-circle" : "ellipse-outline"}
              size={18}
              color={!isDefective ? "#059669" : "#94a3b8"}
            />
            <Text
              className={`text-xs font-bold ${
                !isDefective ? "text-emerald-800" : "text-slate-600"
              }`}
            >
              No Defects (Good)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleToggleDefective(true)}
            activeOpacity={0.8}
            className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 min-h-[44px] ${
              isDefective ? "bg-rose-50 border-rose-500" : "bg-slate-50 border-slate-200"
            }`}
          >
            <Ionicons
              name={isDefective ? "alert-circle" : "ellipse-outline"}
              size={18}
              color={isDefective ? "#e11d48" : "#94a3b8"}
            />
            <Text
              className={`text-xs font-bold ${
                isDefective ? "text-rose-800" : "text-slate-600"
              }`}
            >
              Damaged / Defect
            </Text>
          </TouchableOpacity>
        </View>

        {isDefective && (
          <View className="mt-1 p-3 bg-rose-50/50 rounded-xl border border-rose-200">
            <Text className="text-xs font-bold text-rose-900 mb-1.5">
              Describe the defect or damage noticed:
            </Text>
            <TextInput
              defaultValue={damageDetailsRef.current}
              onChangeText={(text) => {
                damageDetailsRef.current = text;
              }}
              placeholder="e.g. Missing stone on the rim, loose clasp, bent frame upon arrival..."
              placeholderTextColor="#94a3b8"
              multiline
              scrollEnabled={false}
              numberOfLines={3}
              textAlignVertical="top"
              className="border border-rose-200 rounded-lg p-2.5 text-sm text-slate-900 bg-white min-h-[75px]"
            />
          </View>
        )}
      </View>

      {/* 4. Review Comments Section */}
      <View className="bg-white p-4 rounded-2xl border border-divider shadow-xs mb-6">
        <View className="flex-row items-center mb-1">
          <View className="w-7 h-7 rounded-full bg-purple-100 items-center justify-center mr-2.5">
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#7c3aed" />
          </View>
          <Text className="text-base font-bold text-slate-900">Review Comments</Text>
        </View>
        <Text className="text-xs text-slate-500 mb-3">
          Share what you loved most about this product.
        </Text>
        <TextInput
          defaultValue={commentRef.current}
          onChangeText={(text) => {
            commentRef.current = text;
          }}
          placeholder="e.g. Stunning craftsmanship! Looks even better in person, perfect fit."
          placeholderTextColor="#94a3b8"
          multiline
          scrollEnabled={false}
          numberOfLines={3}
          textAlignVertical="top"
          className="border border-slate-200 rounded-xl p-3 text-sm text-slate-800 bg-slate-50/50 min-h-[80px]"
        />
      </View>

      {/* Submit Review Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.8}
        className="bg-[#C1275A] p-4 rounded-2xl items-center justify-center shadow-md min-h-[52px]"
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <View className="flex-row items-center gap-2">
            <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
            <Text className="text-white font-bold text-base">Submit Review & Rating</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {/* Header */}
      <View
        className="px-5 pb-3 bg-white border-b border-divider"
        style={{ paddingTop: Math.max(insets.top + 8, 36) }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 items-center justify-center mr-3 shadow-xs active:scale-95"
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back to orders"
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <View className="bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                <Text className="text-[10px] font-extrabold text-[#C1275A] uppercase tracking-wider">
                  VERIFIED PURCHASE
                </Text>
              </View>
            </View>
            <Text className="text-xl font-bold text-slate-900 mt-0.5">Rate & Review Product</Text>
          </View>
        </View>
      </View>

      {/* Main Body with Smooth Scrolling and Keyboard Handling */}
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          {scrollContent}
        </KeyboardAvoidingView>
      ) : (
        scrollContent
      )}
    </View>
  );
}
