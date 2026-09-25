import { api } from "@/src/api";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Badge from "@/src/components/Badge";
import { apiClient } from "@/src/api/client";
import { useFavoriteStore } from "@/src/store/favoriteStore";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/src/store/authStore";
import { AppIcon } from "@/src/constants/icons";
import { STRINGS } from "@/src/constants/strings";
import { useOrderStore } from "@/src/store/orderStore";

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

  // Centralized E-commerce Order Store: Reactively tracks purchases, repeat buys & reviews
  const {
    hasPurchasedProduct,
    getLatestPurchaseForProduct,
    getPurchaseCountForProduct,
    fetchOrders,
    addOptimisticOrder,
  } = useOrderStore();

  const productIdStr = String(id || product?.id || "").trim();
  const isBought = Boolean(productIdStr && hasPurchasedProduct(productIdStr));
  const latestPurchase = productIdStr ? getLatestPurchaseForProduct(productIdStr) : null;
  const purchaseCount = productIdStr ? getPurchaseCountForProduct(productIdStr) : 0;

  // Interaction states
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [useCustomSize, setUseCustomSize] = useState(false);

  const { favoriteIds, toggleFavorite } = useFavoriteStore();
  const isFavorite = product ? favoriteIds.includes(product.id) : false;

  const [isOrderingWhatsApp, setIsOrderingWhatsApp] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [damageDetails, setDamageDetails] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);


  const fetchProduct = async (isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      const res = await apiClient.get(`/products/${id}`);
      const data = res.data?.data || res.data;
      setProduct(data);

      const safeVariants = Array.isArray(data?.variants) ? data.variants : [];
      if (data?.has_variants && safeVariants.length > 0) {
        setSelectedVariantId((prevId) => {
          if (prevId && safeVariants.some((v: any) => v && v.id === prevId)) {
            return prevId;
          }
          const availableVariants = safeVariants.filter((v: any) => v && (v.quantity || 0) > 0);
          return availableVariants.length > 0 ? (availableVariants[0]?.id || null) : (safeVariants[0]?.id || null);
        });
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
      if (!isSilent) setLoading(false);
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


  useFocusEffect(
    useCallback(() => {
      fetchProduct(true);
      if (token && user) {
        fetchOrders(true);
      }
    }, [id, token, user, fetchOrders])
  );

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
    }
  }, [id, token]);

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

  const displayPrice = getDisplayPrice();
  const displayStock = getDisplayStock();

  useEffect(() => {
    if (!useCustomSize && displayStock > 0 && selectedQuantity > displayStock) {
      setSelectedQuantity(displayStock);
    }
  }, [displayStock, useCustomSize, selectedQuantity]);



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

  const handleSelectVariant = (variantId: string | null) => {
    setSelectedVariantId(variantId);
    setUseCustomSize(false);

    if (variantId && product?.variants) {
      const v = product.variants.find((item: any) => item && item.id === variantId);
      if (v && v.quantity > 0 && selectedQuantity > v.quantity) {
        setSelectedQuantity(v.quantity);
        Alert.alert(
          "Quantity Adjusted",
          `Size ${v.size} only has ${v.quantity} set(s) available in stock. Your order quantity has been set to ${v.quantity}.`,
          [{ text: "OK" }]
        );
      }
    }
  };



  const handleIncreaseQuantity = () => {
    if (useCustomSize) {
      setSelectedQuantity((prev) => prev + 1);
      return;
    }

    if (displayStock <= 0) {
      Alert.alert(
        "Out of Stock",
        `Sorry! This product${
          getActiveVariant() ? ` (Size ${getActiveVariant()?.size})` : ""
        } is currently out of stock. Please select another size.`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    if (selectedQuantity >= displayStock) {
      Alert.alert(
        "Stock Limit Reached",
        `Sorry! Only ${displayStock} set(s) available in stock for this product${
          getActiveVariant() ? ` (Size ${getActiveVariant()?.size})` : ""
        }.\n\nYou cannot select more than the available quantity.`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    setSelectedQuantity((prev) => prev + 1);
  };

  const handleDecreaseQuantity = () => {
    if (selectedQuantity <= 1) return;
    setSelectedQuantity((prev) => prev - 1);
  };

  const openWhatsApp = async () => {
    if (!product || isOrderingWhatsApp) return;

    if (!token || !user) {
      Alert.alert(
        "Authentication Required",
        "Please log in to purchase products and connect via WhatsApp.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log In", onPress: () => router.push("/login" as any) },
        ]
      );
      return;
    }

    if (!useCustomSize) {
      if (displayStock <= 0) {
        Alert.alert(
          "Out of Stock",
          `Sorry! This product${
            getActiveVariant() ? ` (Size ${getActiveVariant()?.size})` : ""
          } is currently out of stock. Please select another size or tap Enquiry to contact us.`,
          [{ text: "OK" }]
        );
        return;
      }

      if (selectedQuantity > displayStock) {
        Alert.alert(
          "Stock Limit Exceeded",
          `You selected ${selectedQuantity} set(s), but only ${displayStock} set(s) are available in stock. Please adjust your quantity to continue.`,
          [
            {
              text: "Adjust to Available",
              onPress: () => setSelectedQuantity(Math.max(1, displayStock)),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }
    }

    let size: string | undefined;

    if (useCustomSize) {
      size = "Custom Made to Order";
    } else {
      const variant = getActiveVariant();
      if (variant) size = variant.size;
    }

    if (isBought) {
      Alert.alert(
        "Enquire / Buy Again?",
        `You previously bought this item.\n\nWould you like to send a new order enquiry for ${selectedQuantity} item(s) to our WhatsApp sales team?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, Enquire on WhatsApp",
            onPress: () => proceedWhatsAppOrder(size),
          },
        ]
      );
      return;
    }

    await proceedWhatsAppOrder(size);
  };

  const proceedWhatsAppOrder = async (
    size?: string,
    customMeasurements?: Record<string, string>
  ) => {
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

      // Add optimistic order to global store so all screens update immediately
      if (result.orderId) {
        addOptimisticOrder({
          id: result.orderId,
          order_number: result.orderNumber,
          user_id: user?.id || "",
          total_amount: result.totalAmount || (getDisplayPrice() * selectedQuantity),
          status: result.status || "pending",
          items: [{
            id: result.orderId + "_item",
            order_id: result.orderId,
            product_id: product.id,
            product_name: product.product_name,
            quantity: selectedQuantity,
            price: getDisplayPrice(),
            size: size || undefined,
            image_url: getGalleryImages()[0] || product.image_url || null,
            status: result.status || "pending",
            is_reviewed: false,
            review_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

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
        // Direct navigation to orders page so when user returns, they are on their orders
        router.push("/orders" as any);
      } else if (result.deliveryMode === "cloud_api") {
        Alert.alert(
          "Order Confirmed!",
          "Your order has been placed successfully and sent to our WhatsApp sales team.",
          [
            {
              text: "View Orders",
              onPress: () => router.push("/orders" as any),
            },
          ]
        );
        router.push("/orders" as any);
      }
    } catch (error: any) {
      const errorCode = error?.response?.data?.error?.code || error?.code;
      const errorMessage = error?.response?.data?.error?.message || error?.message;

      if (
        errorCode === "INSUFFICIENT_STOCK" ||
        errorMessage?.includes("Insufficient stock") ||
        errorMessage?.includes("Only")
      ) {
        Alert.alert(
          "Stock Limit Exceeded",
          errorMessage || `Sorry, only ${displayStock} set(s) are available in stock. Please reduce your order quantity to proceed.`,
          [
            {
              text: "Adjust to Available",
              onPress: () => setSelectedQuantity(Math.max(1, displayStock)),
            },
            { text: "OK", style: "cancel" },
          ]
        );
        return;
      }

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

  return (
    <View className="flex-1 bg-[#FDFCFB]">
      {/* Formatted Back Button */}
      <View
        className="absolute left-4 z-20"
        style={{ top: Math.max(insets.top + 8, 20) }}
      >
        <TouchableOpacity
          className="w-11 h-11 bg-white/95 rounded-full items-center justify-center shadow-lg border border-rose-100 active:scale-95"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home" as any))}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.common.back}
        >
          <Ionicons name="arrow-back" size={22} color="#881337" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="bg-gradient-to-b from-rose-50/70 to-white">
          <ProductImageGallery images={getGalleryImages()} />
        </View>

        <View className="px-5 pt-4 pb-36">
          {/* Brand & Collection Tag */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="bg-rose-100/90 border border-rose-200/80 px-3 py-1 rounded-full flex-row items-center shadow-2xs">
              <Ionicons name="sparkles" size={11} color="#E11D48" style={{ marginRight: 4 }} />
              <Text className="text-[10px] font-black text-[#BE123C] uppercase tracking-wider">
                Sofiya Royal Collection
              </Text>
            </View>

            <View className="flex-row items-center bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full shadow-2xs">
              <AppIcon name="star" size={13} color="#f59e0b" />
              <Text className="text-amber-800 font-extrabold ml-1 text-label-sm">{product.rating || "4.8"}</Text>
              <Text className="text-amber-700/80 ml-1 text-label-sm">({reviews.length || product.reviews || 0} reviews)</Text>
            </View>
          </View>

          {/* Product Title */}
          <View className="mb-2">
            <Text className="text-2xl font-black text-slate-900 tracking-tight leading-8">
              {product.product_name}
            </Text>
            {productModelTypeName || product.category_name ? (
              <Text className="text-xs font-bold text-[#E11D48] mt-0.5 uppercase tracking-wide">
                Category: {productModelTypeName || product.category_name}
              </Text>
            ) : null}
          </View>

          {/* Clean Simple Price Display */}
          <View className="flex-row items-baseline justify-between mb-4 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
            <View className="flex-row items-baseline">
              <Text className="text-3xl font-black text-[#BE123C] tracking-tight">₹{displayPrice}</Text>
              <Text className="text-xs font-semibold text-slate-400 ml-1.5">per set</Text>
            </View>

            {product?.unique_code ? (
              <View className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <Text className="text-[10px] font-mono font-bold text-slate-600">
                  CODE: {product.unique_code}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Size Variant Selector */}
          <ProductVariantSelector
            product={product}
            productModelTypeName={productModelTypeName}
            selectedVariantId={selectedVariantId}
            setSelectedVariantId={setSelectedVariantId}
            onSelectVariant={handleSelectVariant}
            useCustomSize={useCustomSize}
            setUseCustomSize={setUseCustomSize}
          />

          {/* Simple Stock & Quantity to Buy Section */}
          <View className="mb-5 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            {/* Total Stock Available */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Total Stock Available
              </Text>
              {useCustomSize ? (
                <View className="bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                  <Text className="text-xs font-bold text-purple-700">Custom Made to Order</Text>
                </View>
              ) : displayStock > 0 ? (
                <View className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex-row items-center">
                  <Ionicons name="checkmark-circle" size={13} color="#059669" style={{ marginRight: 4 }} />
                  <Text className="text-xs font-extrabold text-emerald-800">
                    {displayStock} {displayStock === 1 ? "set" : "sets"} in stock
                  </Text>
                </View>
              ) : (
                <View className="bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex-row items-center">
                  <Ionicons name="close-circle" size={13} color="#E11D48" style={{ marginRight: 4 }} />
                  <Text className="text-xs font-bold text-rose-700">Out of Stock (0 sets)</Text>
                </View>
              )}
            </View>

            {/* How Many Sets to Buy */}
            <View className="pt-3.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-bold text-slate-900">
                    How many sets do you want to buy?
                  </Text>
                  {displayStock > 0 || useCustomSize ? (
                    <View className="flex-row items-baseline mt-1 gap-1">
                      <Text className="text-base font-extrabold text-[#BE123C]">
                        ₹{displayPrice * selectedQuantity}
                      </Text>
                      <Text className="text-xs text-slate-500 font-medium">
                        for {selectedQuantity} {selectedQuantity === 1 ? "set" : "sets"}
                      </Text>
                      {selectedQuantity > 1 && (
                        <Text className="text-[11px] text-slate-400 font-normal ml-0.5">
                          (₹{displayPrice}/set)
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text className="text-xs text-rose-500 font-medium mt-1">
                      Out of stock for selected size
                    </Text>
                  )}
                </View>

                {displayStock > 0 || useCustomSize ? (
                  <View className="flex-row items-center border border-slate-300 rounded-xl bg-white shadow-2xs overflow-hidden">
                    <TouchableOpacity
                      className="w-10 h-10 items-center justify-center bg-slate-50 active:bg-slate-200"
                      onPress={handleDecreaseQuantity}
                      activeOpacity={0.7}
                      disabled={selectedQuantity <= 1}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease quantity"
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={selectedQuantity <= 1 ? "#cbd5e1" : "#1E293B"}
                      />
                    </TouchableOpacity>

                    <View className="w-11 items-center justify-center py-1">
                      <Text className="font-black text-slate-900 text-base">{selectedQuantity}</Text>
                    </View>

                    <TouchableOpacity
                      className="w-10 h-10 items-center justify-center bg-slate-50 active:bg-slate-200"
                      onPress={handleIncreaseQuantity}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Increase quantity"
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={!useCustomSize && selectedQuantity >= displayStock ? "#94a3b8" : "#1E293B"}
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                    <Text className="text-xs font-bold text-rose-700">Unavailable</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* E-Commerce Verified Purchase Card */}
          {isBought && (
            <View className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 shadow-xs">
              <View className="flex-row items-center mb-1.5">
                <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-2.5">
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm font-bold text-emerald-950">
                      {purchaseCount > 1
                        ? `You've bought this item ${purchaseCount} times`
                        : "You previously bought this item"}
                    </Text>
                    <View className="bg-emerald-200/70 px-1.5 py-0.2 rounded">
                      <Text className="text-[9px] font-extrabold text-emerald-800 uppercase">
                        VERIFIED BUYER
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] text-emerald-700 mt-0.5">
                    Verified in your purchases
                    {latestPurchase?.size ? ` • Size: ${latestPurchase.size}` : ""}
                    {latestPurchase?.purchaseDate
                      ? ` • ${new Date(latestPurchase.purchaseDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}`
                      : ""}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-2 mt-2 pt-2 border-t border-emerald-200/60">
                <TouchableOpacity
                  onPress={() => router.push("/orders" as any)}
                  className="flex-1 py-2 px-3 rounded-xl bg-white border border-emerald-300 items-center justify-center flex-row"
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="View in my purchases"
                >
                  <Ionicons name="receipt-outline" size={13} color="#059669" style={{ marginRight: 4 }} />
                  <Text className="text-xs font-bold text-emerald-900">My Purchases</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (latestPurchase) {
                      router.push({
                        pathname: "/order-review",
                        params: {
                          orderId: latestPurchase.orderId,
                          orderNumber: latestPurchase.orderNumber || "",
                          itemId: latestPurchase.itemId || "",
                          productId: product.id,
                          productName: product.product_name,
                          productImage: getGalleryImages()[0] || product.image_url || "",
                          price: String(getDisplayPrice()),
                          size: getActiveVariant()?.size || "",
                        },
                      } as any);
                    } else {
                      router.push("/orders" as any);
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#C1275A] items-center justify-center flex-row"
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Rate and review product"
                >
                  <Ionicons name="star" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text className="text-xs font-bold text-white">
                    {latestPurchase?.isReviewed ? "Update Review" : "Rate & Review"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Product Description */}
          <View className="mb-6 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <Text className="text-base font-bold text-slate-900 mb-2">
              {STRINGS.productDetail.descriptionLabel}
            </Text>
            <Text className="text-slate-600 text-sm leading-6">
              {product.description || STRINGS.productDetail.noDescription}
            </Text>
          </View>

          {/* Product Reviews */}
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

      {/* Bottom Actions Bar: Side-by-Side Like & Enquiry with Dynamic Total */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200/90 px-4 pt-3 shadow-2xl"
        style={{ paddingBottom: Math.max(insets.bottom + 8, 24) }}
      >
        {isBought && (
          <View className="flex-row items-center justify-center mb-2.5 py-1 px-3 bg-emerald-50 rounded-full border border-emerald-200/80 self-center">
            <Ionicons name="checkmark-circle" size={13} color="#059669" style={{ marginRight: 4 }} />
            <Text className="text-[11px] font-bold text-emerald-800">
              Verified in your purchases • Buy or enquire again
            </Text>
          </View>
        )}

        <View className="flex-row items-center gap-3">
          {/* Like (Favorite) Option beside Buy/Enquiry Button */}
          <TouchableOpacity
            className={`w-[60px] h-[60px] rounded-2xl items-center justify-center border shadow-xs active:scale-95 ${
              isFavorite
                ? "bg-rose-50 border-rose-200"
                : "bg-slate-50 border-slate-200/90"
            }`}
            onPress={handleToggleFavorite}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite
                ? STRINGS.favorites.removeAccessibility
                : STRINGS.favorites.addAccessibility
            }
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={26}
              color={isFavorite ? "#E11D48" : "#475569"}
            />
          </TouchableOpacity>

          {/* Enquiry / Buy Button with Prominent Cost & WhatsApp Action */}
          <TouchableOpacity
            className={`flex-1 h-[60px] px-3.5 rounded-2xl flex-row items-center justify-between shadow-md active:scale-[0.99] ${
              displayStock > 0 || useCustomSize ? "bg-[#16A34A]" : "bg-slate-300"
            }`}
            onPress={openWhatsApp}
            disabled={(displayStock <= 0 && !useCustomSize) || isOrderingWhatsApp}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={
              displayStock > 0 || useCustomSize
                ? `Enquire on WhatsApp for ₹${displayPrice * selectedQuantity}`
                : STRINGS.common.outOfStock
            }
          >
            {isOrderingWhatsApp ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="small" color="white" />
              </View>
            ) : displayStock > 0 || useCustomSize ? (
              <>
                {/* Left: Prominent Total Cost & Quantity Breakdown */}
                <View className="justify-center mr-2">
                  <View className="flex-row items-baseline">
                    <Text className="text-white font-black text-2xl tracking-tight leading-7">
                      ₹{displayPrice * selectedQuantity}
                    </Text>
                  </View>
                  <Text className="text-emerald-100 text-[10px] font-extrabold uppercase tracking-wide">
                    {selectedQuantity} {selectedQuantity === 1 ? "SET" : "SETS"}
                    {selectedQuantity > 1 ? ` • ₹${displayPrice}/set` : ""}
                  </Text>
                </View>

                {/* Right: WhatsApp CTA Action Pill */}
                <View className="flex-row items-center bg-black/15 py-2 px-3 rounded-xl border border-white/20">
                  <Ionicons
                    name="logo-whatsapp"
                    size={19}
                    color="white"
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    className="text-white font-extrabold text-xs tracking-wide"
                    numberOfLines={1}
                  >
                    {isBought ? "Buy Again" : "Enquire on WhatsApp"}
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color="white" style={{ marginLeft: 2 }} />
                </View>
              </>
            ) : (
              <View className="flex-1 flex-row items-center justify-center">
                <Ionicons name="alert-circle" size={20} color="#64748B" style={{ marginRight: 6 }} />
                <Text className="text-slate-600 font-black text-sm uppercase tracking-wider">
                  Out of Stock
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
