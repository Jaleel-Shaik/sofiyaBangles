import type { Product } from '@/src/api/products';
import type { Category } from '@/src/api/categories';
import { api } from "@/src/api";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, TextInput, RefreshControl, Alert, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAdminProducts, deleteProduct, updateProductStock } from '@/src/api/admin';

import { STRINGS } from '@/src/constants/strings';

export default function ProductsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Stock Adjustment Modal State
  const [stockModalTarget, setStockModalTarget] = useState<Product | null>(null);
  const [targetStockQty, setTargetStockQty] = useState(0);
  const [variantStockList, setVariantStockList] = useState<Array<{ id: string; size: string; quantity: number }>>([]);
  const [savingStock, setSavingStock] = useState(false);

  const handleOpenStockModal = (product: Product) => {
    setStockModalTarget(product);
    const safeVariants = Array.isArray(product.variants) ? product.variants : [];
    if (product.has_variants && safeVariants.length > 0) {
      const vList = safeVariants.map((v: any) => ({
        id: v.id || '',
        size: v.size || 'Standard',
        quantity: typeof v.quantity === 'number' ? v.quantity : parseInt(String(v.quantity || 0), 10) || 0,
      }));
      setVariantStockList(vList);
      const total = vList.reduce((sum, v) => sum + v.quantity, 0);
      setTargetStockQty(total || product.quantity || 0);
    } else {
      setVariantStockList([]);
      setTargetStockQty(product.quantity || 0);
    }
  };

  const handleSaveStock = async () => {
    if (!stockModalTarget) return;
    setSavingStock(true);
    try {
      let updatedProduct: any;
      if (variantStockList.length > 0) {
        const total = variantStockList.reduce((sum, v) => sum + v.quantity, 0);
        updatedProduct = await updateProductStock(stockModalTarget.id, {
          quantity: total,
          variants: variantStockList,
        });
      } else {
        updatedProduct = await updateProductStock(stockModalTarget.id, targetStockQty);
      }
      setProducts(prev =>
        prev.map(p =>
          p.id === stockModalTarget.id
            ? { ...p, ...updatedProduct, quantity: updatedProduct?.quantity ?? targetStockQty }
            : p
        )
      );
      Alert.alert('Stock Updated', `Inventory for "${stockModalTarget.product_name}" updated successfully.`);
      setStockModalTarget(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update stock');
    } finally {
      setSavingStock(false);
    }
  };


  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [prodRes, catsRes] = await Promise.allSettled([
        getAdminProducts(1, 100),
        api.categories.getCategories(),
      ]);
      if (prodRes.status === 'fulfilled') {
        setProducts(Array.isArray(prodRes.value?.products) ? prodRes.value.products : []);
      }
      if (catsRes.status === 'fulfilled') {
        setCategories(Array.isArray(catsRes.value) ? catsRes.value : []);
      }
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
    const lower = search.toLowerCase().trim();
    const safeProducts = Array.isArray(products) ? products : [];
    return safeProducts.filter(p => {
      if (!p) return false;
      const pName = (p.product_name || '').toLowerCase();
      const pCode = (p.unique_code || '').toLowerCase();
      const matchesSearch = !lower || pName.includes(lower) || pCode.includes(lower);
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
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              className="bg-slate-900 px-3.5 py-2.5 rounded-full shadow-sm flex-row items-center"
              onPress={() => router.push('/(admin)/quick-sell')}
            >
              <Ionicons name="flash" size={16} color="#fbbf24" />
              <Text className="text-white font-bold text-xs ml-1">Sell</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-primary px-4 py-2.5 rounded-full shadow-sm shadow-primary/30 flex-row items-center"
              onPress={() => router.push('/(admin)/(tabs)/add')}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text className="text-white font-bold text-xs ml-1">Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-text-hint text-xs font-medium ml-[52px]">{totalProducts} total products</Text>
      </View>

      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center bg-surface rounded-2xl border border-divider px-4" style={{ height: 46 }}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or code..."
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

      {/* Collection Filter - Horizontal Scroll */}
      <View className="pb-2" style={{ maxHeight: 44 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5" contentContainerStyle={{ alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-full mr-2 ${!selectedCategory ? 'bg-primary' : 'bg-surface border border-divider'}`}
          >
            <Text className={`text-xs font-bold ${!selectedCategory ? 'text-white' : 'text-text-secondary'}`}>{STRINGS.admin.products.filterAll}</Text>
          </TouchableOpacity>
          {(categories || []).map((cat, idx) => (
            <TouchableOpacity
              key={cat?.id || `admin-prod-cat-${idx}`}
              onPress={() => setSelectedCategory(cat?.id || '')}
              className={`px-4 py-2 rounded-full mr-2 ${selectedCategory === cat?.id ? 'bg-primary' : 'bg-surface border border-divider'}`}
            >
              <Text className={`text-xs font-bold ${selectedCategory === cat?.id ? 'text-white' : 'text-text-secondary'}`}>{cat?.category_name || cat?.name || STRINGS.admin.collections.title}</Text>
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
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/product-detail/[id]', params: { id: item.id } })}
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
                  <TouchableOpacity
                    onPress={() => handleOpenStockModal(item)}
                    className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full flex-row items-center ${isOutOfStock ? 'bg-error/90' : 'bg-success/90'}`}
                  >
                    <Ionicons name="cube-outline" size={10} color="white" />
                    <Text className="text-white text-[10px] font-bold ml-1">
                      {isOutOfStock ? '0' : `${item.quantity}`}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="p-3">
                  <Text className="font-bold text-sm text-text-primary" numberOfLines={1}>{item.product_name}</Text>
                  {cat && (
                    <Text className="text-text-hint text-[10px] font-medium mt-0.5">{cat.category_name}</Text>
                  )}
                  <View className="flex-row items-center justify-between mt-1.5">
                    <Text className="text-[#C25B3E] font-bold text-base">₹{item.price}</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5 mt-2.5 pt-2.5 border-t border-divider">
                    <TouchableOpacity
                      onPress={() => router.push({
                        pathname: '/(admin)/quick-sell',
                        params: { code: item.unique_code || item.id, id: item.id },
                      })}
                      className="flex-row items-center justify-center py-2 px-2.5 bg-primary rounded-xl shadow-xs"
                      activeOpacity={0.8}
                    >
                      <Ionicons name="sparkles" size={12} color="#ffffff" />
                      <Text className="text-white font-bold text-xs ml-1">Sell</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleOpenStockModal(item)}
                      className="flex-row items-center justify-center py-2 px-2.5 bg-slate-100 border border-divider rounded-xl"
                      activeOpacity={0.8}
                      accessibilityLabel="Adjust Stock"
                    >
                      <Ionicons name="cube-outline" size={13} color="#0f172a" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/(admin)/(tabs)/edit-product/[id]', params: { id: item.id } })}
                      className="flex-1 flex-row items-center justify-center py-2 bg-primary/10 rounded-xl"
                      activeOpacity={0.8}
                    >
                      <Ionicons name="pencil" size={13} color="#e11d48" />
                      <Text className="text-primary font-bold text-xs ml-1">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      className="flex-row items-center justify-center py-2 px-2.5 bg-error/10 rounded-xl"
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={13} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Quick Stock Adjustment Modal */}
      <Modal
        visible={!!stockModalTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setStockModalTarget(null)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="bg-surface rounded-3xl p-6 w-full max-w-sm border border-divider shadow-xl">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center mr-3">
                  <Ionicons name="cube" size={20} color="#e11d48" />
                </View>
                <View>
                  <Text className="text-base font-bold text-text-primary" numberOfLines={1}>
                    Update Inventory
                  </Text>
                  <Text className="text-xs text-text-hint">
                    {stockModalTarget?.unique_code || 'Stock Manager'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setStockModalTarget(null)} className="p-1">
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold text-text-primary mb-1" numberOfLines={1}>
              {stockModalTarget?.product_name}
            </Text>
            <Text className="text-xs text-text-secondary mb-4">
              Adjust physical quantity on hand for this design.
            </Text>

            {/* Size Variants or Single Stepper */}
            {variantStockList.length > 0 ? (
              <View className="mb-4 max-h-60">
                <View className="flex-row items-center justify-between pb-2 mb-2 border-b border-divider">
                  <Text className="text-xs font-bold text-text-primary uppercase tracking-wide">
                    Size Variants ({variantStockList.length})
                  </Text>
                  <Text className="text-xs font-black text-primary">
                    Total: {targetStockQty} units
                  </Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} className="max-h-48">
                  {variantStockList.map((v) => (
                    <View
                      key={v.id}
                      className="bg-[#FAFAFA] border border-divider rounded-xl p-2.5 flex-row items-center justify-between mb-2"
                    >
                      <View className="flex-row items-center">
                        <View className="bg-primary/10 px-2.5 py-1 rounded-lg mr-2">
                          <Text className="text-xs font-black text-primary">{v.size}</Text>
                        </View>
                        <Text className="text-xs text-text-hint font-medium">Size</Text>
                      </View>

                      <View className="flex-row items-center">
                        <TouchableOpacity
                          onPress={() => {
                            setVariantStockList((prev) => {
                              const next = prev.map((item) =>
                                item.id === v.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
                              );
                              setTargetStockQty(next.reduce((sum, item) => sum + item.quantity, 0));
                              return next;
                            });
                          }}
                          className="w-8 h-8 rounded-lg bg-white border border-divider items-center justify-center shadow-xs"
                        >
                          <Ionicons name="remove" size={16} color="#0f172a" />
                        </TouchableOpacity>

                        <Text className="w-10 text-center font-bold text-sm text-text-primary">
                          {v.quantity}
                        </Text>

                        <TouchableOpacity
                          onPress={() => {
                            setVariantStockList((prev) => {
                              const next = prev.map((item) =>
                                item.id === v.id ? { ...item, quantity: item.quantity + 1 } : item
                              );
                              setTargetStockQty(next.reduce((sum, item) => sum + item.quantity, 0));
                              return next;
                            });
                          }}
                          className="w-8 h-8 rounded-lg bg-white border border-divider items-center justify-center shadow-xs"
                        >
                          <Ionicons name="add" size={16} color="#0f172a" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <>
                {/* Stepper */}
                <View className="bg-[#FAFAFA] border border-divider rounded-2xl p-4 flex-row items-center justify-between mb-4">
                  <TouchableOpacity
                    onPress={() => setTargetStockQty((q) => Math.max(0, q - 1))}
                    className="w-11 h-11 rounded-xl bg-white border border-divider items-center justify-center shadow-xs"
                  >
                    <Ionicons name="remove" size={20} color="#0f172a" />
                  </TouchableOpacity>

                  <View className="items-center">
                    <Text className="text-2xl font-black text-text-primary font-mono">
                      {targetStockQty}
                    </Text>
                    <Text className="text-[10px] text-text-hint font-bold uppercase">
                      Units in Stock
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setTargetStockQty((q) => q + 1)}
                    className="w-11 h-11 rounded-xl bg-white border border-divider items-center justify-center shadow-xs"
                  >
                    <Ionicons name="add" size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                {/* Quick Increment Buttons */}
                <View className="flex-row gap-2 mb-6">
                  {[5, 10, 25].map((add) => (
                    <TouchableOpacity
                      key={add}
                      onPress={() => setTargetStockQty((q) => q + add)}
                      className="flex-1 py-2 bg-slate-100 rounded-xl items-center border border-divider"
                    >
                      <Text className="text-xs font-bold text-slate-700">+{add}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setStockModalTarget(null)}
                className="flex-1 py-3 bg-slate-100 rounded-xl items-center justify-center border border-divider"
              >
                <Text className="text-slate-600 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveStock}
                disabled={savingStock}
                className="flex-1 py-3 bg-primary rounded-xl items-center justify-center shadow-sm shadow-primary/30"
              >
                {savingStock ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-bold text-sm">Save Stock</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
