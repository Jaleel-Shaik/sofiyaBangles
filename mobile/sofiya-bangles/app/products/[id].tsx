import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { getProductById, Product } from '../../src/api/products';
import { addFavorite, removeFavorite, getFavorites } from '../../src/api/favorites';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../../src/components/Button';
import Badge from '../../src/components/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [mainImage, setMainImage] = useState<string>('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchProduct = async () => {
      if (typeof id === 'string') {
        const data = await getProductById(id);
        setProduct(data);
        if (data && data.images && data.images.length > 0) {
          setMainImage(data.images[0]);
        } else if (data && data.image_url) {
          setMainImage(data.image_url);
        }
        
        // Save to visited history
        if (data) {
          try {
            const historyStr = await AsyncStorage.getItem('@visited_products');
            let history: any[] = historyStr ? JSON.parse(historyStr) : [];
            // Remove if already exists to move it to the front
            history = history.filter(item => item.id !== data.id);
            history.unshift({ id: data.id, category_id: data.category_id });
            // Keep only last 20
            if (history.length > 20) history = history.slice(0, 20);
            await AsyncStorage.setItem('@visited_products', JSON.stringify(history));
          } catch (e) {
            console.error('Error saving visited product', e);
          }
        }
        
        // Check if favorite
        const favs = await getFavorites();
        setIsFavorite(favs.some((f: any) => f.product_id === id));
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

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

  const openWhatsApp = () => {
    if (!product) return;
    const phone = process.env.EXPO_PUBLIC_WHATSAPP_NUMBER || '+1234567890';
    const text = `Hello, I want to purchase ${product.product_name}.\nUnique Code: ${product.unique_code || 'N/A'}\nQuantity: ${selectedQuantity}\nIs this available?`;
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`);
  };

  if (loading || !product) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF0F3]">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FFF0F3]">
      {/* Top Navigation */}
      <View 
        className="absolute left-0 right-0 z-10 flex-row justify-between px-6"
        style={{ top: Math.max(insets.top + 8, 20) }}
      >
        <TouchableOpacity 
          className="w-10 h-10 bg-white/80 rounded-full items-center justify-center shadow-sm"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <TouchableOpacity 
          className="w-10 h-10 bg-white/80 rounded-full items-center justify-center shadow-sm"
          onPress={toggleFavorite}
        >
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? "#FF1F4B" : "#1e293b"} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Images */}
        <View className="items-center px-6 pb-6 bg-[#FFF0F3]" style={{ paddingTop: Math.max(insets.top + 60, 80) }}>
          <View className="w-full aspect-square bg-white rounded-3xl shadow-sm overflow-hidden">
            <Image 
              source={{ uri: mainImage || 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a' }} 
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-6 flex-row">
            {(product.images && product.images.length > 0 ? product.images : [product.image_url || 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a']).map((img, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => setMainImage(img)}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 mr-4 ${mainImage === img ? 'border-rose-400' : 'border-white'} shadow-sm`}
              >
                 <Image 
                  source={{ uri: img }} 
                  className="w-full h-full opacity-80"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Details Section */}
        <View className="bg-white flex-1 rounded-t-3xl px-6 pt-8 pb-32 shadow-sm border-t border-slate-100">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-extrabold text-slate-900">
                {product.product_name}
              </Text>
              {product.unique_code && (
                <Text className="text-sm font-bold text-slate-400 mt-1">Code: {product.unique_code}</Text>
              )}
            </View>
            <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded-lg">
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text className="text-amber-600 font-bold ml-1 text-xs">{product.rating || '4.8'}</Text>
              <Text className="text-slate-400 ml-1 text-xs">({product.reviews || 0})</Text>
            </View>
          </View>

          <Text className="text-3xl font-extrabold text-[#C25B3E] mb-4">₹{product.price}</Text>
          
          <View className="self-start mb-6">
            <Badge 
              label={product.quantity > 0 ? `In Stock — ${product.quantity} pieces left` : 'Out of Stock'}
              variant={product.quantity > 0 ? 'success' : 'danger'}
              icon={product.quantity > 0 ? 'checkmark-circle-outline' : 'close-circle-outline'}
            />
          </View>

          {/* Quantity Selector */}
          {product.quantity > 0 && (
            <View className="flex-row items-center mb-6">
              <Text className="text-sm font-bold text-slate-800 mr-4">Quantity</Text>
              <View className="flex-row items-center border border-slate-200 rounded-full bg-slate-50">
                <TouchableOpacity 
                  className="w-10 h-10 items-center justify-center rounded-l-full"
                  onPress={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                >
                  <Ionicons name="remove" size={20} color="#334155" />
                </TouchableOpacity>
                <Text className="w-10 text-center font-bold text-slate-800 text-lg">
                  {selectedQuantity}
                </Text>
                <TouchableOpacity 
                  className="w-10 h-10 items-center justify-center rounded-r-full"
                  onPress={() => setSelectedQuantity(Math.min(product.quantity, selectedQuantity + 1))}
                >
                  <Ionicons name="add" size={20} color="#334155" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text className="text-sm font-bold text-slate-800 mb-2">Description</Text>
          <Text className="text-slate-500 text-sm leading-6 mb-8">
            {product.description || 'Exquisite handcrafted bridal bangle set finished in lustrous rose gold tones. Adorned with sparkling zircon detailing, perfect for weddings, festivals and special occasions.'}
          </Text>

          <TouchableOpacity className="flex-row items-center justify-center py-3.5 rounded-2xl border border-rose-100 mb-6">
            <Ionicons name="share-social-outline" size={20} color="#e11d48" />
            <Text className="text-rose-600 font-bold ml-2">Share Product</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Action */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/90 px-6 py-4 border-t border-slate-100">
        <TouchableOpacity 
          className="flex-row items-center justify-center py-4 rounded-2xl shadow-sm"
          style={{ backgroundColor: '#25D366' }}
          onPress={openWhatsApp}
        >
          <Ionicons name="chatbubble-outline" size={22} color="white" />
          <Text className="text-white font-extrabold text-base ml-2 mr-2">Inquire on WhatsApp</Text>
          <Ionicons name="cloud" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
