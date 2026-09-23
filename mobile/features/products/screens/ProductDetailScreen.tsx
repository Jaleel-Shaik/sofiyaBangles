import { api } from "@/src/api";
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Badge from "@/src/components/Badge";
import { apiClient } from "@/src/api/client";
import { useFavoriteStore } from "@/src/store/favoriteStore";
import {
  openWhatsAppEnquiry,
  shareProduct,
} from "@/src/utils/whatsapp";
import { useAuthStore } from "@/src/store/authStore";
import { AppIcon } from "@/src/constants/icons";
import { STRINGS } from "@/src/constants/strings";

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
  const [isOrderingWhatsApp, setIsOrderingWhatsApp] = useState(false);

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
      const data = res.data?.data || res.data;
      setProduct(data);

      const safeVariants = Array.isArray(data?.variants) ? data.variants : [];
      if (data?.has_variants && safeVariants.length > 0) {
        const availableVariants = safeVariants.filter((v: any) => v && (v.quantity || 0) > 0);
        if (availableVariants.length > 0) {
          setSelectedVariantId(availableVariants[0]?.id || null);
        } else {
          setSelectedVariantId(safeVariants[0]?.id || null);
        }
      }

      if (data?.model_type_id) {
        try {
          const modelTypes = await api.modelTypes.getModelTypes();
          const modelType = (Array.isArray(modelTypes) ? modelTypes : []).find((m: any) => m && m.id === data.model_type_id);
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
      const reviews = await api.orders.getProductReviews(id as string);
      setReviews(Array.isArray(reviews) ? reviews : []);
    } catch (error) {
      console.log(error);
      setReviews([]);
    }
  };

  const fetchPreferences = async () => {
    if (!token || !user) return;
    try {
      const prefs = await api.sizes.getSizePreferences(user.id);
      const safePrefs = Array.isArray(prefs) ? prefs : [];
      setPreferences(safePrefs.filter((p: any) => p && !p.is_custom));
      const profiles = safePrefs.filter((p: any) => p && p.is_custom);
      setCustomProfiles(profiles);
      if (profiles.length > 0 && profiles[0]?.id) {
        setSelectedCustomProfileId(profiles[0].id);
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
    const safeProfiles = Array.isArray(customProfiles) ? customProfiles : [];
    if (!selectedCustomProfileId && safeProfiles.length > 0) return safeProfiles[0];
    return safeProfiles.find((p) => p && p.id === selectedCustomProfileId) || null;
  }, [selectedCustomProfileId, customProfiles]);

  const handleToggleFavorite = () => {
    if (!product) return;
    toggleFavorite(product.id);
  };

  const getActiveVariant = () => {
    if (!product || !Array.isArray(product.variants)) return null;
    return product.variants.find((v: any) => v && v.id === selectedVariantId) || null;
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
    return Array.isArray(product.images) && product.images.length > 0
      ? product.images.map((img: any) => typeof img === 'string' ? img : img?.image_url).filter(Boolean)
      : [product.image_url || "https://images.unsplash.com/photo-1611591437281-460bfbe1220a"];
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
      Alert.alert(STRINGS.productDetail.orderSuccessTitle, STRINGS.productDetail.orderSuccessMessage);
      router.push("/orders" as any);
    } catch (error) {
      Alert.alert(STRINGS.productDetail.orderErrorTitle, STRINGS.productDetail.orderErrorMessage);
    } finally {
      setIsOrdering(false);
    }
  };

  const handleSubmitReview = async () => {
    if (isReviewSubmitting || !product) return;
    try {
      setIsReviewSubmitting(true);
      await api.orders.createReview({
        productId: product.id,
        rating: reviewRating,
        comment: reviewText.trim() || null,
        damageDetails: damageDetails.trim() || null,
      });
      setReviewSubmitted(true);
      setReviewText("");
      setDamageDetails("");
      Alert.alert(STRINGS.productDetail.reviewThanksTitle, STRINGS.productDetail.reviewThanksMessage);
    } catch (error) {
      Alert.alert(STRINGS.productDetail.orderErrorTitle, STRINGS.productDetail.reviewErrorMessage);
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const openWhatsApp = async () => {
    if (!product || isOrderingWhatsApp) return;

    if (!token || !user) {
      Alert.alert(
        "Authentication Required",
        "Please log in to purchase products and connect via WhatsApp.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log In", onPress: () => router.push("/(auth)/login" as any) },
        ]
      );
      return;
    }

    let size: string | undefined;
    let customMeasurements: Record<string, string> | undefined;

    if (useCustomSize) {
      const profile = activeCustomProfile;
      size = profile?.profile_name
        ? `Custom Made to Order (${profile.profile_name})`
        : "Custom Made to Order";
      if (profile && profile.custom_measurements) {
        customMeasurements = profile.custom_measurements as Record<string, string>;
      }
    } else {
      const variant = getActiveVariant();
      if (variant) size = variant.size;
    }

    try {
      setIsOrderingWhatsApp(true);

      // Secure purchase flow: Mobile app sends product reference and verified user profile.
      // Backend validates user identity from JWT session, derives canonical DB price & stock,
      // creates official order record, and formats/dispatches WhatsApp notification.
      const result = await api.orders.initiateWhatsAppPurchase({
        productId: product.id,
        variantId: selectedVariantId,
        quantity: selectedQuantity,
        size,
        customMeasurements,
        customerName: user?.full_name,
        customerPhone: user?.phone,
      });

      if (result.whatsappUrl) {
        // Universal deep link handling: wa.me works directly or opens in browser
        try {
          await Linking.openURL(result.whatsappUrl);
        } catch (linkError) {
          const fallbackUrl = result.whatsappUrl.replace("https://wa.me/", "https://api.whatsapp.com/send?phone=");
          await Linking.openURL(fallbackUrl).catch(() => {
            Alert.alert("WhatsApp", "Unable to launch WhatsApp. Please make sure WhatsApp is installed.");
          });
        }
      } else if (result.deliveryMode === "cloud_api") {
        Alert.alert(
          "Order Confirmed!",
          `Your order #${result.orderNumber} has been placed successfully and sent to our WhatsApp sales team.`
        );
      }
    } catch (error: any) {
      const errorCode = error?.response?.data?.error?.code || error?.code;
      const errorMessage = error?.response?.data?.error?.message || error?.message;

      if (errorCode === "PROFILE_PHONE_REQUIRED" || errorMessage?.includes("mobile number")) {
        Alert.alert(
          "Mobile Number Required",
          "Please add your WhatsApp number to your profile before placing an order.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Add Number",
              onPress: () => router.push("/profile/whatsapp" as any),
            },
          ]
        );
        return;
      }

      Alert.alert("Purchase Error", errorMessage || "Failed to initiate WhatsApp purchase.");
    } finally {
      setIsOrderingWhatsApp(false);
    }
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
            <AppIcon name="cubeOutline" size={40} color="#e11d48" />
          </View>
          <Text className="text-xl font-bold text-text-primary mb-2">{STRINGS.productDetail.notAvailableTitle}</Text>
          <Text className="text-text-secondary text-center text-sm leading-5 mb-6">
            {STRINGS.productDetail.notAvailableDescription}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={() => router.back()} className="bg-primary px-6 py-3 rounded-full min-h-[44px] justify-center items-center">
              <Text className="text-white font-bold">{STRINGS.productDetail.goBack}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/home" as any)} className="bg-surface px-6 py-3 rounded-full border border-divider min-h-[44px] justify-center items-center">
              <Text className="text-text-primary font-bold">{STRINGS.productDetail.browseProducts}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const displayPrice = getDisplayPrice();
  const displayStock = getDisplayStock();

  return (
    <View className="flex-1 bg-surface">
      <View className="absolute left-0 right-0 z-10 flex-row justify-between px-4" style={{ top: Math.max(insets.top + 8, 20) }}>
        <TouchableOpacity
          className="w-11 h-11 bg-white/95 rounded-full items-center justify-center shadow-sm border border-black/5"
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.common.back}
        >
          <AppIcon name="back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="w-11 h-11 bg-white/95 rounded-full items-center justify-center shadow-sm border border-black/5"
            onPress={handleShare}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.common.share}
          >
            <AppIcon name="share" size={20} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-11 h-11 bg-white/95 rounded-full items-center justify-center shadow-sm border border-black/5"
            onPress={handleToggleFavorite}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? STRINGS.favorites.removeAccessibility : STRINGS.favorites.addAccessibility}
          >
            <AppIcon name={isFavorite ? "heart" : "heartOutline"} size={22} color={isFavorite ? "#e11d48" : "#0f172a"} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <ProductImageGallery images={getGalleryImages()} />

        <View className="bg-surface px-5 pt-6 pb-36">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 pr-4">
              <Text className="text-headline-md font-bold text-text-primary tracking-tight">{product.product_name}</Text>
              {product.unique_code && (
                <Text className="text-label-sm font-medium text-text-hint mt-1">{STRINGS.productDetail.codePrefix}{product.unique_code}</Text>
              )}
            </View>
            <View className="flex-row items-center bg-amber-50 border border-amber-200/70 px-2.5 py-1 rounded-full">
              <AppIcon name="star" size={13} color="#f59e0b" />
              <Text className="text-amber-700 font-bold ml-1 text-label-sm">{product.rating || "4.8"}</Text>
              <Text className="text-text-hint ml-1 text-label-sm">({product.reviews || 0})</Text>
            </View>
          </View>

          <Text className="text-display-md font-extrabold text-[#C25B3E] mb-3">₹{displayPrice}</Text>

          <View className="self-start mb-5">
            <Badge
              label={displayStock > 0 ? (useCustomSize ? STRINGS.common.madeToOrder : STRINGS.common.inStock) : STRINGS.common.outOfStock}
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
            <View className="flex-row items-center mb-6">
              <Text className="text-label-lg font-bold text-text-primary mr-4">{STRINGS.productDetail.quantityLabel}</Text>
              <View className="flex-row items-center border border-divider rounded-full bg-slate-50 shadow-xs">
                <TouchableOpacity
                  className="w-11 h-11 items-center justify-center rounded-l-full"
                  onPress={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={STRINGS.common.decreaseQuantity}
                >
                  <AppIcon name="remove" size={18} color="#334155" />
                </TouchableOpacity>
                <Text className="w-10 text-center font-bold text-text-primary text-title-md">{selectedQuantity}</Text>
                <TouchableOpacity
                  className="w-11 h-11 items-center justify-center rounded-r-full"
                  onPress={() => setSelectedQuantity(Math.min(displayStock, selectedQuantity + 1))}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={STRINGS.common.increaseQuantity}
                >
                  <AppIcon name="add" size={18} color="#334155" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View className="mb-6">
            <Text className="text-title-lg font-bold text-text-primary mb-2">{STRINGS.productDetail.descriptionLabel}</Text>
            <Text className="text-text-secondary text-body-md leading-6">{product.description || STRINGS.productDetail.noDescription}</Text>
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

      <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-divider px-5 pt-3 pb-8 shadow-lg">
        <TouchableOpacity
          className="flex-row items-center justify-center min-h-[50px] py-3.5 rounded-2xl mb-2.5 bg-slate-900 shadow-sm"
          onPress={handleMarkBought}
          disabled={isOrdering}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.common.markBoughtA11y}
        >
          {isOrdering ? <ActivityIndicator size="small" color="white" /> : <AppIcon name="bagOutline" size={20} color="white" />}
          <Text className="text-white font-bold text-title-sm ml-2">{STRINGS.productDetail.markAsBought}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center justify-center min-h-[50px] py-3.5 rounded-2xl shadow-sm"
          style={{ backgroundColor: displayStock > 0 ? "#25D366" : "#94a3b8" }}
          onPress={openWhatsApp}
          disabled={displayStock <= 0 || isOrderingWhatsApp}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={displayStock > 0 ? STRINGS.productDetail.inquireWhatsApp : STRINGS.common.outOfStock}
        >
          {isOrderingWhatsApp ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <AppIcon name="chatbubbleOutline" size={20} color="white" />
              <Text className="text-white font-bold text-title-sm ml-2 mr-1">
                {displayStock > 0 ? STRINGS.productDetail.inquireWhatsApp : STRINGS.common.outOfStock}
              </Text>
              <AppIcon name="whatsapp" size={17} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
