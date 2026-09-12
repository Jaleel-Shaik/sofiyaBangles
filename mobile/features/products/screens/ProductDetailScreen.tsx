import { api } from "@/src/api";
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Badge from "@/src/components/Badge";
import { apiClient } from "@/src/api/client";
import { useFavoriteStore } from "@/src/store/favoriteStore";
import {
  openWhatsAppEnquiry,
  shareProduct,
} from "@/src/utils/whatsapp";
import { useAuthStore } from "@/src/store/authStore";

import { ProductImageGallery } from "../components/ProductImageGallery";
import { ProductVariantSelector } from "../components/ProductVariantSelector";
import { ProductReviewSection } from "../components/ProductReviewSection";

export default function ProductDetailScreen() {
  const { id, fromOrders } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuthStore();

  const [product, setProduct] = useState<any>(null);
  const [productModelTypeName, setProductModelTypeName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Interaction states
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [useCustomSize, setUseCustomSize] = useState(false);

  const { favoriteIds, toggleFavorite } = useFavoriteStore();
  const isFavorite = product ? favoriteIds.includes(product.id) : false;

  const [isOrdering, setIsOrdering] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [damageDetails, setDamageDetails] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Custom Preferences
  const [preferences, setPreferences] = useState<any[]>([]);
  const [customProfiles, setCustomProfiles] = useState<any[]>([]);
  const [selectedCustomProfileId, setSelectedCustomProfileId] = useState<string | null>(null);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/products/${id}`);
      const data = res.data.data;
      setProduct(data);

      if (data.has_variants && data.variants?.length > 0) {
        const availableVariants = data.variants.filter((v: any) => v.quantity > 0);
        if (availableVariants.length > 0) {
          setSelectedVariantId(availableVariants[0].id);
        } else {
          setSelectedVariantId(data.variants[0].id);
        }
      }

      if (data.model_type_id) {
        try {
          const mRes = await apiClient.get(`/categories/models`);
          const modelType = mRes.data.data?.find((m: any) => m.id === data.model_type_id);
          if (modelType) setProductModelTypeName(modelType.name);
        } catch (e) {}
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await apiClient.get(`/reviews/${id}`);
      setReviews(res.data.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchPreferences = async () => {
    if (!token || !user) return;
    try {
      const res = await apiClient.get("/users/preferences");
      if (res.data?.data) {
        setPreferences(res.data.data.standard_preferences || []);
        const profiles = res.data.data.custom_profiles || [];
        setCustomProfiles(profiles);
        if (profiles.length > 0) {
          setSelectedCustomProfileId(profiles[0].id);
        }
      }
    } catch (e) {
      console.log("Error fetching preferences", e);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
      fetchPreferences();
    }
  }, [id, token]);

  const activeCustomProfile = useMemo(() => {
    if (!selectedCustomProfileId && customProfiles.length > 0) return customProfiles[0];
    return customProfiles.find((p) => p.id === selectedCustomProfileId) || null;
  }, [selectedCustomProfileId, customProfiles]);

  const handleToggleFavorite = () => {
    if (!product) return;
    toggleFavorite(product.id);
  };

  const getActiveVariant = () => {
    if (!product || !product.variants) return null;
    return product.variants.find((v: any) => v.id === selectedVariantId) || null;
  };

  const getDisplayPrice = () => {
    if (!product) return 0;
    if (useCustomSize) {
      return product.custom_size_price || product.price;
    }
    const variant = getActiveVariant();
    if (variant) return variant.price;
    return product.price;
  };

  const getDisplayStock = () => {
    if (!product) return 0;
    if (useCustomSize) return 999;
    const variant = getActiveVariant();
    if (variant) return variant.quantity;
    return product.quantity;
  };

  const getGalleryImages = () => {
    if (!product) return [];
    return product.images && product.images.length > 0
      ? product.images.map((img: any) => typeof img === 'string' ? img : img.image_url)
      : [product.image_url || "https://images.unsplash.com/photo-1611591437281-460bfbe1220a"];
  };

  const createReview = async (data: {
    productId: string;
    rating: number;
    comment: string | null;
    damageDetails: string | null;
  }) => {
    const response = await apiClient.post("/reviews", data);
    return response.data;
  };

  const handleMarkBought = async () => {
    if (isOrdering || !product) return;
    try {
      setIsOrdering(true);
      const galleryImages = getGalleryImages();
      await api.orders.createOrder({
        items: [{
          product_id: product.id,
          product_name: product.product_name,
          quantity: selectedQuantity,
          price: getDisplayPrice(),
          image_url: galleryImages[0] || product.image_url || null,
          size: useCustomSize
            ? (activeCustomProfile?.profile_name ? `Custom (${activeCustomProfile.profile_name})` : 'Custom')
            : (getActiveVariant()?.size || undefined),
        }]
      });
      Alert.alert("Saved", "This product is now in your orders list.");
      router.push("/orders" as any);
    } catch (error) {
      Alert.alert("Error", "Could not save this purchase.");
    } finally {
      setIsOrdering(false);
    }
  };

  const handleSubmitReview = async () => {
    if (isReviewSubmitting || !product) return;
    try {
      setIsReviewSubmitting(true);
      await createReview({
        productId: product.id,
        rating: reviewRating,
        comment: reviewText.trim() || null,
        damageDetails: damageDetails.trim() || null,
      });
      setReviewSubmitted(true);
      setReviewText("");
      setDamageDetails("");
      Alert.alert("Thanks!", "Your review has been added.");
    } catch (error) {
      Alert.alert("Error", "Could not save the review.");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const openWhatsApp = async () => {
    if (!product) return;
    let size: string | undefined;
    let customMeasurements: Record<string, string> | undefined;

    if (useCustomSize) {
      const profile = activeCustomProfile;
      size = profile?.profile_name
        ? `Custom Made to Order (${profile.profile_name})`
        : 'Custom Made to Order';
      if (profile && profile.custom_measurements) {
        customMeasurements = profile.custom_measurements as Record<string, string>;
      }
    } else {
      const variant = getActiveVariant();
      if (variant) size = variant.size;
    }

    await openWhatsAppEnquiry({
      productId: product.id,
      productName: product.product_name,
      description: product.description,
      categoryId: product.unique_code || product.category_id,
      cost: getDisplayPrice(),
      size,
      uniqueCode: product.unique_code,
      quantity: selectedQuantity > 1 ? selectedQuantity : undefined,
      customMeasurements,
    });
  };

  const handleShare = async () => {
    if (!product) return;
    let size: string | undefined;
    if (useCustomSize) {
      size = 'Custom Made to Order';
    } else {
      const variant = getActiveVariant();
      if (variant) size = variant.size;
    }

    await shareProduct({
      productId: product.id,
      productName: product.product_name,
      description: product.description,
      categoryId: product.unique_code || product.category_id,
      cost: getDisplayPrice(),
      size,
      uniqueCode: product.unique_code,
      quantity: selectedQuantity > 1 ? selectedQuantity : undefined,
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <View className="items-center">
          <View className="w-20 h-20 bg-rose-50 rounded-full items-center justify-center mb-5">
            <Ionicons name="cube-outline" size={40} color="#e11d48" />
          </View>
          <Text className="text-xl font-bold text-text-primary mb-2">Product Not Available</Text>
          <Text className="text-text-secondary text-center text-sm leading-5 mb-6">
            This product has been removed or is no longer available.{"\n"}It may have been deleted by the store admin.
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={() => router.back()} className="bg-primary px-6 py-3 rounded-full">
              <Text className="text-white font-bold">Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/home" as any)} className="bg-surface px-6 py-3 rounded-full border border-divider">
              <Text className="text-text-primary font-bold">Browse Products</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const displayPrice = getDisplayPrice();
  const displayStock = getDisplayStock();

  return (
    <View className="flex-1 bg-white">
      <View className="absolute left-0 right-0 z-10 flex-row justify-between px-4" style={{ top: Math.max(insets.top + 8, 20) }}>
        <TouchableOpacity className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View className="flex-row gap-2">
          <TouchableOpacity className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm" onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm" onPress={handleToggleFavorite}>
            <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? "#e11d48" : "#1e293b"} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <ProductImageGallery images={getGalleryImages()} />

        <View className="bg-white px-5 pt-6 pb-32">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-bold text-text-primary">{product.product_name}</Text>
              {product.unique_code && (
                <Text className="text-sm font-medium text-text-hint mt-1">Code: {product.unique_code}</Text>
              )}
            </View>
            <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded-lg">
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text className="text-amber-600 font-bold ml-1 text-xs">{product.rating || "4.8"}</Text>
              <Text className="text-text-hint ml-1 text-xs">({product.reviews || 0})</Text>
            </View>
          </View>

          <Text className="text-3xl font-extrabold text-[#C25B3E] mb-3">₹{displayPrice}</Text>

          <View className="self-start mb-5">
            <Badge
              label={displayStock > 0 ? (useCustomSize ? "Made to Order" : `In Stock`) : "Out of Stock"}
              variant={displayStock > 0 ? "success" : "danger"}
              icon={displayStock > 0 ? "checkmark-circle-outline" : "close-circle-outline"}
            />
          </View>

          <ProductVariantSelector
            product={product}
            productModelTypeName={productModelTypeName}
            preferences={preferences}
            selectedVariantId={selectedVariantId}
            setSelectedVariantId={setSelectedVariantId}
            useCustomSize={useCustomSize}
            setUseCustomSize={setUseCustomSize}
            customProfiles={customProfiles}
            selectedCustomProfileId={selectedCustomProfileId}
            setSelectedCustomProfileId={setSelectedCustomProfileId}
            activeCustomProfile={activeCustomProfile}
          />

          {displayStock > 0 && (
            <View className="flex-row items-center mb-5">
              <Text className="text-sm font-bold text-text-primary mr-3">Quantity</Text>
              <View className="flex-row items-center border border-divider rounded-full bg-slate-50">
                <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-l-full" onPress={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}>
                  <Ionicons name="remove" size={20} color="#334155" />
                </TouchableOpacity>
                <Text className="w-10 text-center font-bold text-text-primary text-lg">{selectedQuantity}</Text>
                <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-r-full" onPress={() => setSelectedQuantity(Math.min(displayStock, selectedQuantity + 1))}>
                  <Ionicons name="add" size={20} color="#334155" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View className="mb-6">
            <Text className="text-base font-bold text-text-primary mb-2">Description</Text>
            <Text className="text-text-secondary leading-6">{product.description || "No description provided."}</Text>
          </View>

          <ProductReviewSection
            reviews={reviews}
            fromOrders={fromOrders}
            reviewRating={reviewRating}
            setReviewRating={setReviewRating}
            reviewText={reviewText}
            setReviewText={setReviewText}
            damageDetails={damageDetails}
            setDamageDetails={setDamageDetails}
            isReviewSubmitting={isReviewSubmitting}
            reviewSubmitted={reviewSubmitted}
            handleSubmitReview={handleSubmitReview}
          />
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-divider px-5 pt-3 pb-8">
        <TouchableOpacity className="flex-row items-center justify-center py-3.5 rounded-2xl mb-2 bg-[#111827]" onPress={handleMarkBought} disabled={isOrdering}>
          {isOrdering ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="bag-outline" size={20} color="white" />}
          <Text className="text-white font-bold text-base ml-2">Mark as Bought</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center justify-center py-3.5 rounded-2xl" style={{ backgroundColor: displayStock > 0 ? "#25D366" : "#94a3b8" }} onPress={openWhatsApp} disabled={displayStock <= 0}>
          <Ionicons name="chatbubble-outline" size={20} color="white" />
          <Text className="text-white font-bold text-base ml-2 mr-1">{displayStock > 0 ? "Inquire on WhatsApp" : "Out of Stock"}</Text>
          <Ionicons name="logo-whatsapp" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
