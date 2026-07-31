import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, TextInput, RefreshControl, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCategories, Category } from '@/src/api/categories';
import { getAdminProducts, deleteProduct } from '@/src/api/admin';
import { Product } from '@/src/api/products';

export default function ProductsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [prodRes, cats] = await Promise.all([
        getAdminProducts(1, 100),
        getCategories(),
      ]);
      setProducts(prodRes.products);
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load products', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchData(); }, [])
  );

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.product_name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.product_name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              setProducts(prev => prev.filter(p => p.id !== product.id));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const totalProducts = products.length;
  const filteredCount = filteredProducts.length;

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View
        className="px-5 pb-4 bg-primary/5"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center">
            <TouchableOpacity
              className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-3 border border-divider"
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#e11d48" />
            </TouchableOpacity>
            <View>
              <Text className="text-primary font-semibold text-xs uppercase tracking-widest mb-0.5">Admin Space</Text>
              <Text className="text-2xl font-bold text-text-primary">Products</Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-primary px-5 py-3 rounded-full shadow-sm shadow-primary/30"
            onPress={() => router.push('/(admin)/(tabs)/add' as any)}
          >
            <View className="flex-row items-center">
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-bold text-sm ml-1.5">Add</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text className="text-text-hint text-xs font-medium ml-[52px]">{totalProducts} total products</Text>
      </View>

      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center bg-surface rounded-2xl border border-divider px-4" style={{ height: 46 }}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor="#94a3b8"
            className="flex-1 px-2.5 text-text-primary text-base"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} className="p-1">
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Filter - Horizontal Scroll */}
      <View className="pb-2" style={{ maxHeight: 44 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5" contentContainerStyle={{ alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-full mr-2 ${!selectedCategory ? 'bg-primary' : 'bg-surface border border-divider'}`}
          >
            <Text className={`text-xs font-bold ${!selectedCategory ? 'text-white' : 'text-text-secondary'}`}>All</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full mr-2 ${selectedCategory === cat.id ? 'bg-primary' : 'bg-surface border border-divider'}`}
            >
              <Text className={`text-xs font-bold ${selectedCategory === cat.id ? 'text-white' : 'text-text-secondary'}`}>{cat.category_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} colors={["#e11d48"]} tintColor="#e11d48" />
          }
          ListHeaderComponent={
            search || selectedCategory ? (
              <View className="pb-2 px-2">
                <Text className="text-text-hint text-xs font-medium">
                  Showing {filteredCount} of {totalProducts} products
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <View className="w-16 h-16 bg-rose-50 rounded-full items-center justify-center mb-4">
                <Ionicons name="cube-outline" size={32} color="#e11d48" />
              </View>
              <Text className="text-text-secondary font-semibold text-base">
                {search || selectedCategory ? 'No matches found' : 'No products yet'}
              </Text>
              <Text className="text-text-hint text-sm mt-1">
                {search || selectedCategory ? 'Try a different search or filter' : 'Add your first product to get started'}
              </Text>
              {!search && !selectedCategory && (
                <TouchableOpacity
                  className="mt-5 bg-primary px-8 py-3.5 rounded-full shadow-sm shadow-primary/30"
                  onPress={() => router.push('/(admin)/(tabs)/add' as any)}
                >
                  <Text className="text-white font-bold text-sm">Add Product</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const cat = categories.find(c => c.id === item.category_id);
            const isOutOfStock = item.quantity <= 0;
            return (
              <TouchableOpacity
                className="flex-1 bg-surface rounded-2xl mb-3 border border-divider overflow-hidden shadow-sm"
                activeOpacity={0.95}
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/product-detail/[id]', params: { id: item.id } } as any)}
              >
                <View className="aspect-[4/3] bg-[#FAFAFA] overflow-hidden relative">
                  <Image
                    source={{ uri: item.image_url || item.images?.[0] || 'https://via.placeholder.com/150' }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  {!item.is_active && (
                    <View className="absolute top-2 left-2 bg-text-primary/80 px-2 py-0.5 rounded-full">
                      <Text className="text-white text-[9px] font-bold">DRAFT</Text>
                    </View>
                  )}
                  <View className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full ${isOutOfStock ? 'bg-error/90' : 'bg-success/90'}`}>
                    <Text className="text-white text-[10px] font-bold">
                      {isOutOfStock ? '0' : `${item.quantity}`}
                    </Text>
                  </View>
                </View>
                <View className="p-3">
                  <Text className="font-bold text-sm text-text-primary" numberOfLines={1}>{item.product_name}</Text>
                  {cat && (
                    <Text className="text-text-hint text-[10px] font-medium mt-0.5">{cat.category_name}</Text>
                  )}
                  <View className="flex-row items-center justify-between mt-1.5">
                    <Text className="text-[#C25B3E] font-bold text-base">₹{item.price}</Text>
                  </View>
                  <View className="flex-row items-center gap-2 mt-2.5 pt-2.5 border-t border-divider">
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/(admin)/(tabs)/edit-product/[id]', params: { id: item.id } } as any)}
                      className="flex-1 flex-row items-center justify-center py-2 bg-primary/10 rounded-xl"
                    >
                      <Ionicons name="pencil" size={14} color="#e11d48" />
                      <Text className="text-primary font-bold text-xs ml-1">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      className="flex-row items-center justify-center py-2 px-3 bg-error/10 rounded-xl"
                    >
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
