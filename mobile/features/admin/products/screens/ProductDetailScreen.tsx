import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getProductById, Product } from '@/src/api/products';

import { sellProduct, deleteProduct } from '@/src/api/admin';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellQty, setSellQty] = useState(1);
  const [selling, setSelling] = useState(false);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const prod = await getProductById(id as string);
      setProduct(prod);
    } catch (error) {
      console.error('Failed to load product', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchProduct(); }, [id])
  );

  const handleSell = async () => {
    if (!product) return;
    if (sellQty < 1) { Alert.alert('Error', 'Quantity must be at least 1'); return; }
    if (sellQty > product.quantity) { Alert.alert('Error', 'Not enough stock'); return; }
    setSelling(true);
    try {
      const updated = await sellProduct(id as string, sellQty);
      setProduct(updated);
      setSellQty(1);
      Alert.alert('Success', `Sold ${sellQty} unit(s)!`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sell product');
    } finally {
      setSelling(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#FAFAFA] items-center justify-center">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 bg-[#FAFAFA] items-center justify-center">
        <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
        <Text className="text-text-hint mt-4 text-base font-medium">Product not found</Text>
      </View>
    );
  }

  const isOutOfStock = product.quantity <= 0;
  const images = product.images && product.images.length > 0 
    ? product.images.map((img: any) => typeof img === 'string' ? img : img.image_url) 
    : product.image_url ? [product.image_url] : [];

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View
        className="px-5 pb-5 bg-primary/5"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <View className="flex-row items-center justify-between mb-1">
          <TouchableOpacity
            className="w-10 h-10 bg-surface rounded-full items-center justify-center border border-divider"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#e11d48" />
          </TouchableOpacity>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="w-10 h-10 bg-surface rounded-full items-center justify-center border border-divider"
              onPress={() => router.push({ pathname: '/(admin)/(tabs)/edit-product/[id]', params: { id: product.id } } as any)}
            >
              <Ionicons name="pencil" size={20} color="#e11d48" />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 bg-surface rounded-full items-center justify-center border border-divider"
              onPress={() => {
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
                          router.back();
                        } catch (err: any) {
                          Alert.alert('Error', err.message || 'Failed to delete product');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-primary font-semibold text-xs uppercase tracking-widest mb-0.5 ml-[52px]">Admin Space</Text>
        <Text className="text-2xl font-bold text-text-primary ml-[52px]" numberOfLines={1}>{product.product_name}</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            {images.map((uri, idx) => (
              <View key={idx} className="mr-3">
                <Image source={{ uri }} className="w-72 h-72 rounded-2xl bg-surface" resizeMode="cover" />
              </View>
            ))}
          </ScrollView>
        )}

        <View className="bg-surface rounded-2xl p-5 mb-4 border border-divider">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-text-primary">Product Information</Text>
            <View className={`px-3 py-1 rounded-full ${product.is_active === false ? 'bg-slate-100 border border-divider' : 'bg-success/10'}`}>
              <Text className={`text-xs font-bold ${product.is_active === false ? 'text-text-hint' : 'text-success'}`}>
                {product.is_active === false ? 'Draft' : 'Active'}
              </Text>
            </View>
          </View>
          <View className="space-y-3">
            <View className="flex-row justify-between py-2 border-b border-divider">
              <Text className="text-text-secondary font-medium">Code</Text>
              <Text className="text-text-primary font-bold">{product.unique_code || '—'}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-divider">
              <Text className="text-text-secondary font-medium">Price</Text>
              <Text className="text-[#C25B3E] font-bold">₹{product.price}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-divider">
              <Text className="text-text-secondary font-medium">Stock</Text>
              <Text className={`font-bold ${isOutOfStock ? 'text-error' : 'text-text-primary'}`}>
                {isOutOfStock ? 'Out of Stock' : `${product.quantity} units`}
              </Text>
            </View>
            {product.has_variants && product.variants && product.variants.length > 0 && (
              <View className="flex-row justify-between py-2 border-b border-divider">
                <Text className="text-text-secondary font-medium">Variants</Text>
                <Text className="text-text-primary font-medium">{product.variants.length} sizes</Text>
              </View>
            )}
            {product.accepts_custom_size && (
              <View className="flex-row justify-between py-2">
                <Text className="text-text-secondary font-medium">Custom Size Price</Text>
                <Text className="text-text-primary font-medium">₹{product.custom_size_price}</Text>
              </View>
            )}
          </View>
        </View>

        {product.description ? (
          <View className="bg-surface rounded-2xl p-5 mb-4 border border-divider">
            <Text className="text-lg font-bold text-text-primary mb-2">Description</Text>
            <Text className="text-text-secondary leading-relaxed">{product.description}</Text>
          </View>
        ) : null}

        <View className="bg-surface rounded-2xl p-5 mb-4 border border-divider">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
              <Ionicons name="cart" size={16} color="#e11d48" />
            </View>
            <Text className="text-lg font-bold text-text-primary">Sell Product</Text>
          </View>
          {isOutOfStock ? (
            <View className="bg-error/10 p-4 rounded-xl">
              <Text className="text-error font-bold text-center">Cannot sell — out of stock.</Text>
            </View>
          ) : (
            <View>
              <View className="flex-row items-center justify-center mb-4">
                <TouchableOpacity
                  className="w-10 h-10 bg-surface rounded-xl border border-divider items-center justify-center"
                  onPress={() => setSellQty(q => Math.max(1, q - 1))}
                >
                  <Ionicons name="remove" size={20} color="#64748b" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-text-primary mx-5 min-w-[30px] text-center">{sellQty}</Text>
                <TouchableOpacity
                  className="w-10 h-10 bg-surface rounded-xl border border-divider items-center justify-center"
                  onPress={() => setSellQty(q => Math.min(product.quantity, q + 1))}
                >
                  <Ionicons name="add" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                className="bg-primary py-4 rounded-2xl items-center flex-row justify-center"
                onPress={handleSell}
                disabled={selling}
              >
                {selling ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="cart" size={20} color="white" />
                    <Text className="text-white font-bold ml-2">Sell {sellQty} Unit(s)</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text className="text-text-hint text-xs text-center mt-2">
                Decrements stock by {sellQty} (remaining: {product.quantity - sellQty})
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
