import type { Product } from '@/src/api/products';
import { api } from "@/src/api";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useState, useCallback, useRef, useMemo } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthStore } from "@/src/store/authStore";
import { useSizeStore } from "@/src/store/sizeStore";

import { getCategories, Category } from "@/src/api/categories";
import { getUserOrders } from "@/src/api/orders";
import ProductCard from "@/src/components/ProductCard";
import CategoryItem from "@/src/components/CategoryItem";
import { AppIcon } from "@/src/constants/icons";
import { STRINGS } from "@/src/constants/strings";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuthStore();
  const { preferences, fetchPreferences } = useSizeStore();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>("all");
  const [purchasedProductIds, setPurchasedProductIds] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setPage(1);
      const [productsResult, categoriesResult] = await Promise.allSettled([
        api.products.getRecommendedProducts(1, 50),
        getCategories(),
      ]);

      if (productsResult.status === 'fulfilled') {
        const prods = Array.isArray(productsResult.value?.products)
          ? productsResult.value.products
          : [];
        setProducts(prods);
        setHasMore(prods.length >= 50);
      } else {
        console.warn("Failed to load products:", productsResult.reason);
        setProducts([]);
      }

      if (categoriesResult.status === 'fulfilled') {
        const cats = Array.isArray(categoriesResult.value) ? categoriesResult.value : [];
        setCategories(cats);
      } else {
        console.warn("Failed to load categories:", categoriesResult.reason);
        setCategories([]);
      }
    } catch (error) {
      console.error("Failed to load home data", error);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || isFetchingMore || loading) return;
    setIsFetchingMore(true);
    const nextPage = page + 1;
    try {
      const response = await api.products.getRecommendedProducts(nextPage, 10);
      const incoming = Array.isArray(response?.products) ? response.products : [];
      if (incoming.length > 0) {
        setProducts((prev) => [...(Array.isArray(prev) ? prev : []), ...incoming]);
        setPage(nextPage);
      }
      if (incoming.length < 10) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more products", error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Fetch size preferences and orders if logged in as customer
      if (token && user?.role === 'user') {
        try {
          fetchPreferences();
        } catch (e) {
          console.warn("Error fetching size preferences", e);
        }

        const loadPurchasedProducts = async () => {
          try {
            const orders = await getUserOrders();
            const safeOrders = Array.isArray(orders) ? orders : [];
            const productIds = safeOrders.flatMap(
              (order) => (order?.items || []).map((item) => item?.product_id).filter(Boolean)
            );
            setPurchasedProductIds(productIds.filter(Boolean));
          } catch (error) {
            console.warn("Failed to load purchased products", error);
          }
        };
        loadPurchasedProducts();
      }

      fetchInitialData();
    }, [token, user?.role])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInitialData();
  }, []);

  const getDisplayName = () => {
    if (!user) return STRINGS.home.roles.user;
    const name =
      user.full_name?.trim() ||
      (user as any).name?.trim() ||
      (user as any).displayName?.trim() ||
      user.email?.split("@")[0];

    if (user.role === "super_admin") {
      return name || STRINGS.home.roles.superAdmin;
    }
    if (user.role === "admin") {
      return name || STRINGS.home.roles.admin;
    }
    return name || STRINGS.home.roles.user;
  };

  const { width: windowWidth } = useWindowDimensions();
  const bannerScrollRef = useRef<ScrollView>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // Define banners FIRST so snapOffsets and JSX always have valid array
  const banners = [
    {
      ...STRINGS.home.banners.newArrivals,
      gradient: ["#e11d48", "#be123c", "#881337"],
      textColor: "text-[#e11d48]",
      icon: "sparkles",
    },
    {
      ...STRINGS.home.banners.collections,
      gradient: ["#4f46e5", "#4338ca", "#312e81"],
      textColor: "text-[#4f46e5]",
      icon: "grid",
    },
    {
      ...STRINGS.home.banners.sizePreferences,
      gradient: ["#d97706", "#b45309", "#78350f"],
      textColor: "text-[#b45309]",
      icon: "ruler",
    },
  ];

  const BANNER_WIDTH = Math.max(windowWidth - 40, 280);
  const BANNER_GAP = 12;
  const snapOffsets = useMemo(
    () => (banners || []).map((_, i) => i * (BANNER_WIDTH + BANNER_GAP)),
    [BANNER_WIDTH]
  );

  const handleBannerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / (BANNER_WIDTH + BANNER_GAP));
    if (index >= 0 && index < banners.length && index !== activeBannerIndex) {
      setActiveBannerIndex(index);
    }
  };

  const scrollToBanner = (index: number) => {
    bannerScrollRef.current?.scrollTo({
      x: index * (BANNER_WIDTH + BANNER_GAP),
      animated: true,
    });
    setActiveBannerIndex(index);
  };

  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    const safeProducts = Array.isArray(products) ? products : [];
    safeProducts.forEach((p) => {
      if (p?.has_variants && Array.isArray(p.variants)) {
        p.variants.forEach((v) => {
          if (v?.size && (v.quantity || 0) > 0) sizeSet.add(v.size);
        });
      }
    });
    return Array.from(sizeSet);
  }, [products]);

  const hasConfiguredSizes = (preferences || []).length > 0;

  const filteredProducts = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products.filter(Boolean) : [];
    if (selectedSizeFilter === "all") return safeProducts;

    const safePrefs = Array.isArray(preferences) ? preferences : [];
    if (selectedSizeFilter === "my_sizes") {
      return safeProducts.filter((p) => {
        if (!p) return false;
        const hasCustomPref = safePrefs.some(
          (pref) => pref && pref.category_id === p.category_id && pref.is_custom
        );
        if (p.accepts_custom_size && hasCustomPref) return true;

        const standardPref = safePrefs.find(
          (pref) => pref && pref.category_id === p.category_id && !pref.is_custom
        );
        if (standardPref?.standard_size && p.has_variants && Array.isArray(p.variants)) {
          return p.variants.some(
            (v) => v && v.size === standardPref.standard_size && (v.quantity || 0) > 0
          );
        }
        if (!p.has_variants) return true;
        return false;
      });
    }

    return safeProducts.filter((p) => {
      if (!p) return false;
      if (p.has_variants && Array.isArray(p.variants)) {
        return p.variants.some(
          (v) => v && v.size === selectedSizeFilter && (v.quantity || 0) > 0
        );
      }
      return false;
    });
  }, [products, selectedSizeFilter, preferences]);

  const renderHeader = () => (
    <>
      {/* Horizontally Scrollable Promotional Banners (3 Sections) */}
      <View className="mt-4">
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled={false}
          snapToOffsets={snapOffsets}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onScroll={handleBannerScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {(banners || []).map((b, index) => (
            <TouchableOpacity
              key={b.id}
              activeOpacity={0.92}
              onPress={() => router.push(b.route as any)}
              style={{
                width: BANNER_WIDTH,
                height: 184,
                marginRight: index < banners.length - 1 ? BANNER_GAP : 0,
              }}
              className="rounded-3xl overflow-hidden relative shadow-md"
            >
              <LinearGradient
                colors={b.gradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="flex-1 p-5 justify-between"
              >
                {/* Decorative background ambient circles */}
                <View className="absolute -right-6 -top-8 w-44 h-44 rounded-full bg-white/10" />
                <View className="absolute -right-2 -bottom-8 w-32 h-32 rounded-full bg-black/10" />

                <View className="flex-row items-center justify-between flex-1">
                  {/* Left content: badge, title, subtitle, CTA button */}
                  <View className="flex-1 pr-3 justify-between h-full py-0.5">
                    <View>
                      <View className="bg-white/20 px-2.5 py-0.5 rounded-full self-start mb-1.5 border border-white/25">
                        <Text className="text-overline font-extrabold text-white uppercase tracking-wider">
                          {b.badge}
                        </Text>
                      </View>
                      <Text className="text-white text-headline-md font-extrabold tracking-tight leading-7">
                        {b.title}
                      </Text>
                      <Text
                        className="text-white/90 text-body-sm mt-1 font-medium leading-5"
                        numberOfLines={2}
                      >
                        {b.subtitle}
                      </Text>
                    </View>

                    <View className="bg-white px-4 py-2 rounded-full self-start flex-row items-center shadow-md">
                      <Text className={`font-bold text-label-md mr-1.5 ${b.textColor}`}>
                        {b.buttonText}
                      </Text>
                      <AppIcon name="arrowForward" size={13} color={b.gradient[0]} />
                    </View>
                  </View>

                  {/* Right visual icon */}
                  <View className="w-18 h-18 rounded-2xl bg-white/20 border border-white/30 items-center justify-center shadow-sm ml-1">
                    <AppIcon name={b.icon as any} size={36} color="white" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Carousel Pagination Dots */}
        <View className="flex-row justify-center items-center mt-3.5 gap-2">
          {(banners || []).map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => scrollToBanner(idx)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={`Go to banner ${idx + 1}`}
              className={`h-2 rounded-full ${
                activeBannerIndex === idx ? "w-6 bg-primary" : "w-2 bg-slate-300"
              }`}
            />
          ))}
        </View>
      </View>

      {/* Collections Carousel */}
      {(categories || []).length > 0 && (
        <View className="mt-5">
          <View className="flex-row justify-between items-center px-5 mb-3">
            <Text className="text-title-lg font-bold text-text-primary">{STRINGS.home.sections.collections}</Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/categories")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.collections.seeAll}
            >
              <Text className="text-primary font-semibold text-label-md">{STRINGS.common.seeAll}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="pl-5"
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {(categories || []).map((cat: Category) => (
              <CategoryItem
                key={cat.id}
                name={cat.category_name}
                imageUrl={cat.image_url}
                onPress={() =>
                  router.push({
                    pathname: "/category/[id]",
                    params: { id: cat.id, name: cat.category_name },
                  })
                }
                className="mr-5"
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Size Preferences & Filter Bar (renders if sizes exist) */}
      {((availableSizes || []).length > 0 || hasConfiguredSizes) && (
        <View className="mt-5 px-5">
          <View className="flex-row justify-between items-center mb-2.5">
            <View className="flex-row items-center">
              <AppIcon name="filter" size={14} color="#e11d48" />
              <Text className="text-label-md font-bold text-text-primary ml-1.5">
                {STRINGS.home.filterBySize}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/size-preferences" as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.home.mySizePreferences}
            >
              <Text className="text-label-sm font-bold text-primary">
                {STRINGS.home.mySizePreferences}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
            {/* All Sizes */}
            <TouchableOpacity
              onPress={() => setSelectedSizeFilter("all")}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.common.allSizes}
              className={`mr-2.5 px-4 min-h-[44px] justify-center items-center rounded-full border shadow-xs ${
                selectedSizeFilter === "all"
                  ? "bg-primary border-primary"
                  : "bg-white border-divider"
              }`}
            >
              <Text
                className={`text-label-sm font-semibold ${
                  selectedSizeFilter === "all" ? "text-white font-bold" : "text-text-secondary"
                }`}
              >
                {STRINGS.common.allSizes}
              </Text>
            </TouchableOpacity>

            {/* My Sizes Option */}
            {hasConfiguredSizes && (
              <TouchableOpacity
                onPress={() => setSelectedSizeFilter("my_sizes")}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="My Sizes"
                className={`mr-2.5 px-4 min-h-[44px] justify-center items-center rounded-full border flex-row shadow-xs ${
                  selectedSizeFilter === "my_sizes"
                    ? "bg-primary border-primary"
                    : "bg-rose-50 border-rose-200"
                }`}
              >
                <AppIcon
                  name="sparkles"
                  size={13}
                  color={selectedSizeFilter === "my_sizes" ? "white" : "#e11d48"}
                />
                <Text
                  className={`text-label-sm font-semibold ml-1.5 ${
                    selectedSizeFilter === "my_sizes" ? "text-white font-bold" : "text-primary"
                  }`}
                >
                  My Sizes ★
                </Text>
              </TouchableOpacity>
            )}

            {/* Individual sizes found in products */}
            {(availableSizes || []).map((sz) => (
              <TouchableOpacity
                key={sz}
                onPress={() => setSelectedSizeFilter(sz)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={STRINGS.categoryProducts.sizeLabel(sz)}
                className={`mr-2.5 px-4 min-h-[44px] justify-center items-center rounded-full border shadow-xs ${
                  selectedSizeFilter === sz
                    ? "bg-primary border-primary"
                    : "bg-white border-divider"
                }`}
              >
                <Text
                  className={`text-label-sm font-semibold ${
                    selectedSizeFilter === sz ? "text-white font-bold" : "text-text-secondary"
                  }`}
                >
                  {STRINGS.categoryProducts.sizeLabel(sz)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View className="px-5 mt-5 mb-3">
        <Text className="text-title-lg font-bold text-text-primary">
          {STRINGS.home.sections.recommended}
        </Text>
      </View>
    </>
  );

  return (
    <View className="flex-1 bg-background">
      {/* Static Refined Luxury Header Section */}
      <LinearGradient
        colors={["#FFF4F6", "#FFFFFF"]}
        className="px-5 pb-4 border-b border-rose-100 shadow-sm"
        style={{ paddingTop: Math.max(insets.top + 8, 34) }}
      >
        <View className="flex-row items-center justify-between">
          {/* Left Column: Greeting, Name, Tagline */}
          <View className="flex-1 mr-3">
            {/* Eyebrow Greeting & Role Badge */}
            <View className="flex-row items-center">
              <Text className="text-label-sm font-medium text-slate-500">
                {STRINGS.home.greeting}
              </Text>
              {user?.role === "super_admin" && (
                <View className="ml-2 bg-rose-600 px-2 py-0.5 rounded-full shadow-sm">
                  <Text className="text-overline font-bold text-white uppercase tracking-wider">
                    {STRINGS.home.roles.superAdmin}
                  </Text>
                </View>
              )}
              {user?.role === "admin" && (
                <View className="ml-2 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                  <Text className="text-overline font-bold text-rose-700 uppercase tracking-wider">
                    {STRINGS.home.roles.admin}
                  </Text>
                </View>
              )}
            </View>

            {/* User Name as Primary Title */}
            <Text
              className="text-headline-md font-bold text-slate-900 tracking-tight mt-0.5"
              numberOfLines={1}
            >
              {getDisplayName()}
            </Text>

            {/* Tagline */}
            <View className="flex-row items-center mt-1">
              <AppIcon name="sparkles" size={13} color="#e11d48" style={{ marginRight: 5 }} />
              <Text className="text-label-md font-semibold text-rose-600 tracking-wide">
                {STRINGS.home.tagline}
              </Text>
            </View>
          </View>

          {/* Right Column: Action Buttons */}
          <View className="flex-row items-center">
            {/* Dedicated Search Option Button */}
            <TouchableOpacity
              onPress={() => router.push("/search" as any)}
              className="w-11 h-11 rounded-full bg-white shadow-sm border border-rose-100 items-center justify-center mr-2.5 relative"
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.common.search}
            >
              <AppIcon name="search" size={20} color="#e11d48" />
            </TouchableOpacity>

            {/* Orders Bag Button */}
            <TouchableOpacity
              onPress={() => router.push("/orders" as any)}
              className="w-11 h-11 rounded-full bg-white shadow-sm border border-rose-100 items-center justify-center mr-2.5 relative"
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.home.actions.viewOrders}
            >
              <AppIcon name="bag" size={20} color="#e11d48" />
              {(purchasedProductIds || []).length > 0 && (
                <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 items-center justify-center border-2 border-white shadow-sm">
                  <Text className="text-overline font-extrabold text-white">
                    {purchasedProductIds.length > 9 ? "9+" : purchasedProductIds.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Profile Avatar */}
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.home.actions.viewProfile}
              className="relative"
            >
              {user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  className="w-11 h-11 rounded-full border-2 border-rose-200 shadow-sm"
                />
              ) : (
                <View className="w-11 h-11 rounded-full border-2 border-rose-200 bg-rose-50 shadow-sm items-center justify-center">
                  <AppIcon name="profile" size={20} color="#e11d48" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={filteredProducts || []}
        keyExtractor={(item, idx) => item?.id || `home-prod-${idx}`}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 100 }}
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#e11d48"]}
          />
        }
        ListHeaderComponent={renderHeader()}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          item ? (
            <ProductCard
              product={item}
              isPurchased={(purchasedProductIds || []).includes(item.id)}
            />
          ) : null
        )}
        ListEmptyComponent={
          loading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#e11d48" />
              <Text className="text-text-secondary text-body-sm mt-3 font-medium">
                {STRINGS.home.states.loadingRecommendations}
              </Text>
            </View>
          ) : (
            <View className="py-16 items-center justify-center px-6">
              <View className="w-16 h-16 rounded-full bg-rose-50 items-center justify-center mb-3 border border-rose-100">
                <AppIcon name="sparklesOutline" size={28} color="#e11d48" />
              </View>
              <Text className="text-title-sm font-bold text-text-primary mb-1">
                {STRINGS.home.states.noProductsTitle}
              </Text>
              <Text className="text-caption text-text-secondary text-center mb-4">
                {STRINGS.home.states.noProductsDescription}
              </Text>
              <TouchableOpacity
                onPress={fetchInitialData}
                className="bg-primary px-5 py-2.5 rounded-full"
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text className="text-white text-label-md font-bold">
                  {STRINGS.common.refreshNow}
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingMore ? (
            <View className="py-5 items-center">
              <ActivityIndicator size="small" color="#e11d48" />
            </View>
          ) : null
        }
      />
    </View>
  );
}
