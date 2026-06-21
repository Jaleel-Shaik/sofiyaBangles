import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { getProductById, Product } from '../../src/api/products';
import { addFavorite, removeFavorite, getFavorites } from '../../src/api/favorites';
import Button from '../../src/components/Button';
import Badge from '../../src/components/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchProduct = async () => {
      if (typeof id === 'string') {
        const data = await getProductById(id);
        setProduct(data);
        
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
    const text = `Hello, I want to inquire about the ${product.product_name}. Is it available?`;
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
              source={{ uri: product.image_url || 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a' }} 
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          
          <View className="flex-row gap-4 mt-6">
            {[1, 2, 3].map((item) => (
              <View key={item} className={`w-14 h-14 rounded-full overflow-hidden border-2 ${item === 1 ? 'border-rose-400' : 'border-white'} shadow-sm`}>
                 <Image 
                  source={{ uri: product.image_url || 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a' }} 
                  className="w-full h-full opacity-80"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Details Section */}
        <View className="bg-white flex-1 rounded-t-3xl px-6 pt-8 pb-32 shadow-sm border-t border-slate-100">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-2xl font-extrabold text-slate-900 flex-1 pr-4">
              {product.product_name}
            </Text>
            <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded-lg">
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text className="text-amber-600 font-bold ml-1 text-xs">4.8</Text>
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
