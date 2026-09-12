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
} from "react-native";
import { useState, useCallback, useMemo } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthStore } from "@/src/store/authStore";
import { useSizeStore } from "@/src/store/sizeStore";

import { getCategories, Category } from "@/src/api/categories";
import { getUserOrders } from "@/src/api/orders";
import ProductCard from "@/src/components/ProductCard";
import SearchInput from "@/src/components/SearchInput";
import CategoryItem from "@/src/components/CategoryItem";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuthStore();
  const { preferences, fetchPreferences } = useSizeStore();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
        api.products.getRecommendedProducts(1, 50, searchQuery.trim()),
        getCategories(),
      ]);

      if (productsResult.status === 'fulfilled') {
        setProducts(productsResult.value.products);
        setHasMore(productsResult.value.products.length >= 50);
      } else {
        console.warn("Failed to load products:", productsResult.reason);
      }

      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value);
      } else {
        console.warn("Failed to load categories:", categoriesResult.reason);
      }
    } catch (error) {
      console.error("Failed to load home data", error);
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
      const response = await api.products.getRecommendedProducts(nextPage, 10, searchQuery);
      if (response.products.length > 0) {
        setProducts((prev) => [...prev, ...response.products]);
        setPage(nextPage);
      }
      if (response.products.length < 10) {
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
      // Only fetch user-specific preferences and orders if logged in as a customer
      if (token && user?.role === 'user') {
        try {
          fetchPreferences();
        } catch (e) {
          console.warn("Error fetching size preferences", e);
        }

        const loadPurchasedProducts = async () => {
          try {
            const orders = await getUserOrders();
            const productIds = orders.flatMap((order) => order.items?.map((item) => item.product_id) || []);
            setPurchasedProductIds(productIds.filter(Boolean));
          } catch (error) {
            console.warn("Failed to load purchased products", error);
          }
        };
        loadPurchasedProducts();
      }
    }, [token, user?.role])
  );

  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    products.forEach((p) => {
      if (p.has_variants && p.variants) {
        p.variants.forEach((v) => {
          if (v.size && v.quantity > 0) sizeSet.add(v.size);
        });
      }
    });
    return Array.from(sizeSet);
  }, [products]);

  const hasConfiguredSizes = preferences.length > 0;

  const filteredProducts = useMemo(() => {
    if (selectedSizeFilter === "all") return products;

    if (selectedSizeFilter === "my_sizes") {
      return products.filter((p) => {
        const hasCustomPref = preferences.some(
          (pref) => pref.category_id === p.category_id && pref.is_custom
        );
        if (p.accepts_custom_size && hasCustomPref) return true;

        const userPref = preferences.find(
          (pref) => pref.category_id === p.category_id && !pref.is_custom
        );
        if (userPref && userPref.standard_size && p.has_variants && p.variants) {
          return p.variants.some(
            (v) => v.size === userPref.standard_size && v.quantity > 0
          );
        }

        if (!p.has_variants) return true;

        return false;
      });
    }

    if (selectedSizeFilter === "custom") {
      return products.filter((p) => p.accepts_custom_size);
    }

    return products.filter((p) => {
      if (p.has_variants && p.variants) {
        return p.variants.some(
          (v) => v.size === selectedSizeFilter && v.quantity > 0
        );
      }
      return false;
    });
  }, [products, selectedSizeFilter, preferences]);

  useFocusEffect(
    useCallback(() => {
      // Immediate load on focus when there is no search query
      if (!searchQuery.trim()) {
        fetchInitialData();
        return;
      }
      // Debounce active search queries
      const delayDebounceFn = setTimeout(() => {
        fetchInitialData();
      }, 400);
      return () => clearTimeout(delayDebounceFn);
    }, [searchQuery])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInitialData();
  }, []);

  const renderHeader = () => (
    <>
      <View
        className="px-5 pb-5 bg-primary/5"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <Text className="text-primary font-medium text-sm">Welcome back!</Text>
            <Text className="text-2xl font-bold text-text-primary mt-1">
              Find Your Perfect Bangle
            </Text>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.push("/orders" as any)}
              className="w-10 h-10 rounded-full bg-white shadow-sm border border-primary/20 items-center justify-center mr-3"
            >
              <Ionicons name="bag-outline" size={20} color="#e11d48" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
              {user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                />
              ) : (
                <View className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-white items-center justify-center">
                  <Ionicons name="person" size={22} color="#cbd5e1" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <SearchInput
          placeholder="Search bangles, styles..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchInitialData}
          onSearchPress={fetchInitialData}
          returnKeyType="search"
        />
      </View>

      <View className="px-5 mt-5">
        <TouchableOpacity
          className="bg-primary rounded-2xl p-5 relative overflow-hidden"
          onPress={() => router.push("/new-arrivals" as any)}
        >
          <View className="w-3/5 z-10">
            <Text className="text-white text-xl font-bold mb-3 leading-7">
              New Arrivals{"\n"}Just Dropped
            </Text>
            <View className="bg-white px-4 py-2 rounded-full self-start">
              <Text className="text-primary font-bold text-sm">Explore Now</Text>
            </View>
          </View>
          <View className="absolute -right-4 -top-8 w-40 h-40 rounded-full bg-white/10" />
          <View className="absolute right-5 bottom-4 flex-row gap-1 z-10 items-center">
            <View className="w-3 h-1 bg-white rounded-full" />
            <View className="w-1 h-1 bg-white/50 rounded-full" />
            <View className="w-1 h-1 bg-white/50 rounded-full" />
          </View>
        </TouchableOpacity>
      </View>

      {categories.length > 0 && (
        <View className="mt-5">
          <View className="flex-row justify-between items-center px-5 mb-3">
            <Text className="text-base font-bold text-text-primary">Categories</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/categories")}>
              <Text className="text-primary font-semibold text-sm">See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="pl-5"
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {categories.map((cat: Category) => (
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

      {/* Size Preferences & Filter Bar */}
      <View className="mt-5 px-5">
        <View className="flex-row justify-between items-center mb-2.5">
          <View className="flex-row items-center">
            <Ionicons name="funnel-outline" size={14} color="#e11d48" />
            <Text className="text-sm font-bold text-text-primary ml-1.5">Filter by Size</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/size-preferences" as any)}>
            <Text className="text-xs font-bold text-primary">My Size Preferences</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
          {/* All Sizes */}
          <TouchableOpacity
            onPress={() => setSelectedSizeFilter("all")}
            className={`mr-2 px-3.5 py-1.5 rounded-full border ${
              selectedSizeFilter === "all"
                ? "bg-primary border-primary"
                : "bg-white border-divider"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedSizeFilter === "all" ? "text-white" : "text-text-secondary"
              }`}
            >
              All Sizes
            </Text>
          </TouchableOpacity>

          {/* My Sizes Option */}
          {hasConfiguredSizes && (
            <TouchableOpacity
              onPress={() => setSelectedSizeFilter("my_sizes")}
              className={`mr-2 px-3.5 py-1.5 rounded-full border flex-row items-center ${
                selectedSizeFilter === "my_sizes"
                  ? "bg-primary border-primary"
                  : "bg-rose-50 border-rose-200"
              }`}
            >
              <Ionicons
                name="sparkles"
                size={12}
                color={selectedSizeFilter === "my_sizes" ? "white" : "#e11d48"}
              />
              <Text
                className={`text-xs font-bold ml-1 ${
                  selectedSizeFilter === "my_sizes" ? "text-white" : "text-primary"
                }`}
              >
                My Sizes ★
              </Text>
            </TouchableOpacity>
          )}

          {/* Individual sizes found in products */}
          {availableSizes.map((sz) => (
            <TouchableOpacity
              key={sz}
              onPress={() => setSelectedSizeFilter(sz)}
              className={`mr-2 px-3.5 py-1.5 rounded-full border ${
                selectedSizeFilter === sz
                  ? "bg-primary border-primary"
                  : "bg-white border-divider"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedSizeFilter === sz ? "text-white" : "text-text-secondary"
                }`}
              >
                Size {sz}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Custom Size Option */}
          <TouchableOpacity
            onPress={() => setSelectedSizeFilter("custom")}
            className={`mr-4 px-3.5 py-1.5 rounded-full border flex-row items-center ${
              selectedSizeFilter === "custom"
                ? "bg-primary border-primary"
                : "bg-white border-divider"
            }`}
          >
            <Ionicons
              name="cut-outline"
              size={12}
              color={selectedSizeFilter === "custom" ? "white" : "#64748b"}
            />
            <Text
              className={`text-xs font-bold ml-1 ${
                selectedSizeFilter === "custom" ? "text-white" : "text-text-secondary"
              }`}
            >
              Custom Sized
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View className="px-5 mt-5 mb-3 flex-row justify-between items-center">
        <Text className="text-base font-bold text-text-primary">
          {searchQuery.trim()
            ? `Results for "${searchQuery.trim()}"`
            : "Recommended"}
        </Text>
        {selectedSizeFilter !== "all" && (
          <Text className="text-xs text-primary font-semibold">
            {filteredProducts.length} in {selectedSizeFilter === "my_sizes" ? "My Sizes" : selectedSizeFilter === "custom" ? "Custom" : `Size ${selectedSizeFilter}`}
          </Text>
        )}
      </View>
    </>
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
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
          <ProductCard
            product={item}
            isPurchased={purchasedProductIds.includes(item.id)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#e11d48" />
            </View>
          ) : (
            <View className="py-20 items-center justify-center">
              <Text className="text-text-secondary font-medium">No products found.</Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingMore ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#e11d48" />
            </View>
          ) : null
        }
      />
    </View>
  );
}
