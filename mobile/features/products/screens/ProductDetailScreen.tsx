import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getProductById, Product } from "@/src/api/products";
import { addFavorite, removeFavorite, getFavorites } from "@/src/api/favorites";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Badge from "@/src/components/Badge";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSizeStore } from "@/src/store/sizeStore";
import { getCategories } from "@/src/api/categories";
import { getModelTypes } from "@/src/api/modelTypes";
import { createOrder, createReview, getProductReviews } from "@/src/api/orders";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GALLERY_IMAGE_WIDTH = SCREEN_WIDTH;

export default function ProductDetailScreen() {
  const { id, fromOrders, orderId } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const insets = useSafeAreaInsets();

  const { preferences } = useSizeStore();
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [selectedCustomProfileId, setSelectedCustomProfileId] =
    useState<string>("");
  const [productModelTypeName, setProductModelTypeName] = useState<string>("");
  const [reviews, setReviews] = useState<
    {
      id: string;
      rating: number;
      comment: string | null;
      damage_details: string | null;
      created_at: string;
    }[]
  >([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryScrollRef = useRef<ScrollView>(null);
  const [reviewText, setReviewText] = useState("");
  const [damageDetails, setDamageDetails] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (typeof id === "string") {
        const data = await getProductById(id);
        setProduct(data);
        if (data) {
          const [cats, mts] = await Promise.all([
            getCategories(),
            getModelTypes(),
          ]);
          const productCategory = cats.find((c) => c.id === data.category_id);
          if (productCategory) {
            setProductModelTypeName(productCategory.category_name);
          }

          if (data.category_id) {
            if (
              data.has_variants &&
              data.variants &&
              data.variants.length > 0
            ) {
              const userPref = preferences.find(
                (p) => p.category_id === data.category_id && !p.is_custom,
              );
              if (userPref && userPref.standard_size) {
                const matchedVariant = data.variants.find(
                  (v: any) => v.size === userPref.standard_size,
                );
                if (matchedVariant && matchedVariant.quantity > 0) {
                  setSelectedVariantId(matchedVariant.id);
                }
              } else {
                const available = data.variants.find(
                  (v: any) => v.quantity > 0,
                );
                if (available) setSelectedVariantId(available.id);
              }
            }

            if (data.accepts_custom_size) {
              const customPref = preferences.find(
                (p) => p.category_id === data.category_id && p.is_custom,
              );
              if (customPref) {
                setSelectedCustomProfileId(customPref.id);
              }
            }
          } else {
            if (
              data.has_variants &&
              data.variants &&
              data.variants.length > 0
            ) {
              const available = data.variants.find((v: any) => v.quantity > 0);
              if (available) setSelectedVariantId(available.id);
            }
          }

          try {
            const historyStr = await AsyncStorage.getItem("@visited_products");
            let history: any[] = historyStr ? JSON.parse(historyStr) : [];
            history = history.filter((item) => item.id !== data.id);
            history.unshift({ id: data.id, category_id: data.category_id });
            if (history.length > 20) history = history.slice(0, 20);
            await AsyncStorage.setItem(
              "@visited_products",
              JSON.stringify(history),
            );
          } catch (e) {
            console.error("Error saving visited product", e);
          }
        }

        const favs = await getFavorites();
        setIsFavorite(favs.some((f: any) => f.product_id === id));

        const productReviews = await getProductReviews(id);
        setReviews(productReviews);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id, preferences]);

  const toggleFavorite = async () => {
    if (!product) return;
    try {
      if (isFavorite) {
        await removeFavorite(product.id);
        setIsFavorite(false);
      } else {
        await addFavorite(product.id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / GALLERY_IMAGE_WIDTH);
    if (index !== activeImageIndex) {
      setActiveImageIndex(index);
    }
  };

  const getActiveVariant = () => {
    if (!product || !product.has_variants || !product.variants) return null;
    return product.variants.find((v) => v.id === selectedVariantId) || null;
  };

  const getDisplayPrice = () => {
    if (!product) return 0;
    if (useCustomSize && product.custom_size_price)
      return product.custom_size_price;
    const variant = getActiveVariant();
    if (variant && variant.price) return variant.price;
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
      ? product.images
      : [product.image_url || "https://images.unsplash.com/photo-1611591437281-460bfbe1220a"];
  };

  const handleMarkBought = async () => {
    if (!product) return;
    try {
      setIsOrdering(true);
      const galleryImages = getGalleryImages();
      await createOrder({
        productId: product.id,
        productName: product.product_name,
        price: displayPrice,
        imageUrl: galleryImages[activeImageIndex] || product.image_url || null,
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
    if (!product) return;
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

  const openWhatsApp = () => {
    if (!product) return;
    const phone = process.env.EXPO_PUBLIC_WHATSAPP_NUMBER || "+1234567890";
    let text = `Hello, I want to purchase ${product.product_name}.\nUnique Code: ${product.unique_code || "N/A"}\nQuantity: ${selectedQuantity}`;

    if (useCustomSize) {
      const customPref = preferences.find(
        (p) => p.id === selectedCustomProfileId,
      );
      text += `\nSize: Custom Made to Order`;
      if (customPref && customPref.custom_measurements) {
        text += `\nMy Measurements:`;
        Object.entries(customPref.custom_measurements).forEach(([k, v]) => {
          text += `\n- ${k}: ${v}`;
        });
      }
    } else {
      const variant = getActiveVariant();
      if (variant) {
        text += `\nSize: ${variant.size}`;
      }
    }

    text += `\nIs this available?`;
    Linking.openURL(
      `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`,
    );
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
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-primary px-6 py-3 rounded-full"
            >
              <Text className="text-white font-bold">Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/home" as any)}
              className="bg-surface px-6 py-3 rounded-full border border-divider"
            >
              <Text className="text-text-primary font-bold">Browse Products</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const displayPrice = getDisplayPrice();
  const displayStock = getDisplayStock();
  const customProfiles = product?.category_id
    ? preferences.filter(
        (p) => p.category_id === product.category_id && p.is_custom,
      )
    : [];

  return (
    <View className="flex-1 bg-white">
      <View
        className="absolute left-0 right-0 z-10 flex-row justify-between px-4"
        style={{ top: Math.max(insets.top + 8, 20) }}
      >
        <TouchableOpacity
          className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <TouchableOpacity
          className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm"
          onPress={toggleFavorite}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={24}
            color={isFavorite ? "#e11d48" : "#1e293b"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View
          className="bg-white"
          style={{ paddingTop: Math.max(insets.top + 60, 80) }}
        >
          <View className="w-full aspect-square bg-[#FAFAFA]">
            <ScrollView
              ref={galleryScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onGalleryScroll}
              scrollEventThrottle={16}
            >
              {getGalleryImages().map((img, index) => (
                <View key={index} style={{ width: GALLERY_IMAGE_WIDTH }} className="aspect-square">
                  <Image
                    source={{ uri: img }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {getGalleryImages().length > 1 && (
            <View className="flex-row justify-center mt-3 mb-4">
              {getGalleryImages().map((_, index) => (
                <View
                  key={index}
                  className={`mx-1 rounded-full ${activeImageIndex === index ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-slate-300"}`}
                />
              ))}
            </View>
          )}
        </View>

        <View className="bg-white px-5 pt-6 pb-32">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-bold text-text-primary">
                {product.product_name}
              </Text>
              {product.unique_code && (
                <Text className="text-sm font-medium text-text-hint mt-1">
                  Code: {product.unique_code}
                </Text>
              )}
            </View>
            <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded-lg">
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text className="text-amber-600 font-bold ml-1 text-xs">
                {product.rating || "4.8"}
              </Text>
              <Text className="text-text-hint ml-1 text-xs">
                ({product.reviews || 0})
              </Text>
            </View>
          </View>

          <Text className="text-3xl font-extrabold text-[#C25B3E] mb-3">
            ₹{displayPrice}
          </Text>

          <View className="self-start mb-5">
            <Badge
              label={
                displayStock > 0
                  ? useCustomSize
                    ? "Made to Order"
                    : `In Stock`
                  : "Out of Stock"
              }
              variant={displayStock > 0 ? "success" : "danger"}
              icon={
                displayStock > 0
                  ? "checkmark-circle-outline"
                  : "close-circle-outline"
              }
            />
          </View>

          {(product.has_variants || product.accepts_custom_size) && (
            <View className="mb-5 pt-4 border-t border-divider">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-base font-bold text-text-primary">
                  {productModelTypeName
                    ? `${productModelTypeName} Sizes`
                    : "Select Size"}
                </Text>
              </View>

              {product.has_variants && product.variants && (
                <View className="flex-row flex-wrap mb-4">
                  {product.variants.map((variant) => {
                    const isPerfectFit =
                      product.category_id &&
                      preferences.some(
                        (p) =>
                          p.category_id === product.category_id &&
                          !p.is_custom &&
                          p.standard_size === variant.size,
                      );
                    const isSelected =
                      !useCustomSize && selectedVariantId === variant.id;
                    const isDisabled = variant.quantity <= 0;

                    return (
                      <TouchableOpacity
                        key={variant.id}
                        disabled={isDisabled}
                        onPress={() => {
                          setSelectedVariantId(variant.id);
                          setUseCustomSize(false);
                        }}
                        className={`mr-2 mb-2 pt-3 pb-2 px-4 rounded-xl border-2 ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : isDisabled
                              ? "border-divider bg-slate-50 opacity-50"
                              : "border-divider bg-white"
                        }`}
                      >
                        {isPerfectFit && (
                          <View className="absolute top-0 right-0 bg-primary px-1 py-0.5 rounded-bl-lg">
                            <Ionicons name="star" size={8} color="white" />
                          </View>
                        )}
                        <Text
                          className={`font-bold text-base text-center ${isSelected ? "text-primary" : "text-text-primary"}`}
                        >
                          {variant.size}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {product.accepts_custom_size && (
                <View className="bg-white rounded-2xl border border-divider overflow-hidden">
                  <TouchableOpacity
                    className="flex-row items-center p-4 bg-slate-50 border-b border-divider"
                    onPress={() => setUseCustomSize(!useCustomSize)}
                  >
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${useCustomSize ? "bg-primary border-primary" : "border-slate-300 bg-white"}`}
                    >
                      {useCustomSize && (
                        <View className="w-2.5 h-2.5 bg-white rounded-full" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-text-primary text-base">
                        Custom Made to Order
                      </Text>
                      <Text className="text-text-secondary text-xs mt-0.5">
                        We&apos;ll craft this perfectly to your measurements.
                      </Text>
                    </View>
                    {product.custom_size_price && (
                      <View className="bg-primary/10 px-2 py-1 rounded-md">
                        <Text className="text-primary font-bold text-xs">
                          + ₹{product.custom_size_price}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {useCustomSize && (
                    <View className="p-4">
                      {customProfiles.length > 0 ? (
                        <>
                          <Text className="text-xs text-text-hint mb-3 font-bold uppercase tracking-widest">
                            Select Saved Profile
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                          >
                            {customProfiles.map((p) => (
                              <TouchableOpacity
                                key={p.id}
                                onPress={() => setSelectedCustomProfileId(p.id)}
                                className={`mr-3 px-4 py-3 rounded-xl border-2 ${selectedCustomProfileId === p.id ? "border-primary bg-primary/10" : "border-divider bg-slate-50"}`}
                              >
                                <View className="flex-row items-center">
                                  <Ionicons
                                    name="person-outline"
                                    size={14}
                                    color={
                                      selectedCustomProfileId === p.id
                                        ? "#e11d48"
                                        : "#64748B"
                                    }
                                  />
                                  <Text
                                    className={`text-sm font-bold ml-1.5 ${selectedCustomProfileId === p.id ? "text-primary" : "text-text-primary"}`}
                                  >
                                    {p.profile_name}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </>
                      ) : (
                        <View className="items-center bg-primary/5 p-4 rounded-2xl border border-dashed border-primary/30">
                          <Ionicons
                            name="cut-outline"
                            size={24}
                            color="#e11d48"
                          />
                          <Text className="text-text-secondary text-center text-sm font-medium my-3">
                            No custom measurements saved for this category.
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              router.push("/profile/size-preferences" as any)
                            }
                            className="bg-primary px-5 py-2.5 rounded-full"
                          >
                            <Text className="text-white font-bold text-xs">
                              Add Measurements Now
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {displayStock > 0 && (
            <View className="flex-row items-center mb-5">
              <Text className="text-sm font-bold text-text-primary mr-3">
                Quantity
              </Text>
              <View className="flex-row items-center border border-divider rounded-full bg-slate-50">
                <TouchableOpacity
                  className="w-10 h-10 items-center justify-center rounded-l-full"
                  onPress={() =>
                    setSelectedQuantity(Math.max(1, selectedQuantity - 1))
                  }
                >
                  <Ionicons name="remove" size={20} color="#334155" />
                </TouchableOpacity>
                <Text className="w-10 text-center font-bold text-text-primary text-lg">
                  {selectedQuantity}
                </Text>
                <TouchableOpacity
                  className="w-10 h-10 items-center justify-center rounded-r-full"
                  onPress={() =>
                    setSelectedQuantity(
                      Math.min(displayStock, selectedQuantity + 1),
                    )
                  }
                >
                  <Ionicons name="add" size={20} color="#334155" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text className="text-sm font-bold text-text-primary mb-2">Description</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-6">
            {product.description ||
              "Exquisite handcrafted bridal bangle set finished in lustrous rose gold tones. Adorned with sparkling zircon detailing, perfect for weddings, festivals and special occasions."}
          </Text>

          <View className="bg-slate-50 rounded-2xl p-4 mb-6 border border-divider">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-bold text-text-primary">Buyer feedback</Text>
              <Text className="text-xs text-text-secondary">{reviews.length} review(s)</Text>
            </View>
            {reviews.length > 0 ? (
              reviews.slice(0, 3).map((review) => (
                <View
                  key={review.id}
                  className="mb-3 rounded-2xl bg-white p-3 border border-divider"
                >
                  <View className="flex-row items-center mb-1">
                    {Array.from({ length: review.rating }).map((_, index) => (
                      <Ionicons
                        key={index}
                        name="star"
                        size={14}
                        color="#f59e0b"
                      />
                    ))}
                  </View>
                  {review.comment ? (
                    <Text className="text-sm text-text-secondary">{review.comment}</Text>
                  ) : null}
                  {review.damage_details ? (
                    <Text className="text-xs text-text-hint mt-1">Damage note: {review.damage_details}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text className="text-sm text-text-secondary">No reviews yet.</Text>
            )}
          </View>

          {fromOrders === "true" && (
            <View className="bg-white rounded-2xl border border-primary/20 p-4 mb-6">
              <Text className="text-sm font-bold text-text-primary mb-2">Rate this purchase</Text>
              <Text className="text-xs text-text-secondary mb-3">Share how it felt and any notes.</Text>
              <View className="flex-row mb-3">
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity key={value} onPress={() => setReviewRating(value)}>
                    <Ionicons
                      name={value <= reviewRating ? "star" : "star-outline"}
                      size={22}
                      color="#f59e0b"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={reviewText}
                onChangeText={setReviewText}
                placeholder="Share your experience with this product"
                className="border border-divider rounded-2xl px-4 py-3 text-sm text-text-primary mb-3"
                multiline
              />
              <TextInput
                value={damageDetails}
                onChangeText={setDamageDetails}
                placeholder="Any damage or issues? (optional)"
                className="border border-divider rounded-2xl px-4 py-3 text-sm text-text-primary mb-3"
                multiline
              />
              <TouchableOpacity
                onPress={handleSubmitReview}
                className="bg-primary px-4 py-3 rounded-2xl self-start"
                disabled={isReviewSubmitting}
              >
                {isReviewSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-bold">Submit Review</Text>
                )}
              </TouchableOpacity>
              {reviewSubmitted && (
                <Text className="text-xs text-success mt-2">Review saved successfully.</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-divider px-5 pt-3 pb-8">
        <TouchableOpacity
          className="flex-row items-center justify-center py-3.5 rounded-2xl mb-2 bg-[#111827]"
          onPress={handleMarkBought}
          disabled={isOrdering}
        >
          {isOrdering ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="bag-outline" size={20} color="white" />
          )}
          <Text className="text-white font-bold text-base ml-2">Mark as Bought</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center justify-center py-3.5 rounded-2xl"
          style={{ backgroundColor: displayStock > 0 ? "#25D366" : "#94a3b8" }}
          onPress={openWhatsApp}
          disabled={displayStock <= 0}
        >
          <Ionicons name="chatbubble-outline" size={20} color="white" />
          <Text className="text-white font-bold text-base ml-2 mr-1">
            {displayStock > 0 ? "Inquire on WhatsApp" : "Out of Stock"}
          </Text>
          <Ionicons name="logo-whatsapp" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
