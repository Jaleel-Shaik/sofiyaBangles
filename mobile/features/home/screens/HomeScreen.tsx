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
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/src/store/authStore";
import { getRecommendedProducts, Product } from "@/src/api/products";
import { getCategories, Category } from "@/src/api/categories";
import { getUserOrders } from "@/src/api/orders";
import ProductCard from "@/src/components/ProductCard";
import SearchInput from "@/src/components/SearchInput";
import CategoryItem from "@/src/components/CategoryItem";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [purchasedProductIds, setPurchasedProductIds] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setPage(1);
      const [fetchedProductsResponse, fetchedCategories] = await Promise.all([
        getRecommendedProducts(1, 50, searchQuery.trim()),
        getCategories(),
      ]);
      setProducts(fetchedProductsResponse.products);
      setCategories(fetchedCategories);
      setHasMore(fetchedProductsResponse.products.length >= 50);
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
      const response = await getRecommendedProducts(nextPage, 10, searchQuery);
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

  useEffect(() => {
    const loadPurchasedProducts = async () => {
      try {
        const orders = await getUserOrders();
        setPurchasedProductIds(orders.map((order) => order.product_id));
      } catch (error) {
        console.error("Failed to load purchased products", error);
      }
    };
    loadPurchasedProducts();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInitialData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

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

      <View className="px-5 mt-5 mb-3">
        <Text className="text-base font-bold text-text-primary">
          {searchQuery.trim()
            ? `Results for "${searchQuery.trim()}"`
            : "Recommended"}
        </Text>
      </View>
    </>
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <FlatList
        data={products}
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
