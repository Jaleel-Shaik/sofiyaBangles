import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getProductById, Product } from '../../src/api/products';
import { addFavorite, removeFavorite, getFavorites } from '../../src/api/favorites';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Badge from '../../src/components/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSizeStore } from '../../src/store/sizeStore';
import { getCategories } from '../../src/api/categories';
import { getModelTypes } from '../../src/api/modelTypes';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [mainImage, setMainImage] = useState<string>('');
  const insets = useSafeAreaInsets();
  
  // Sizing State
  const { preferences } = useSizeStore();
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [selectedCustomProfileId, setSelectedCustomProfileId] = useState<string>('');
  const [productModelTypeId, setProductModelTypeId] = useState<string | null>(null);
  const [productModelTypeName, setProductModelTypeName] = useState<string>('');

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
        if (data) {
          const [cats, mts] = await Promise.all([getCategories(), getModelTypes()]);
          const productCategory = cats.find(c => c.id === data.category_id);
          
          if (productCategory) {
            setProductModelTypeName(productCategory.category_name);
          }

          // Preselect size if user has a preference for this category_id
          if (data.category_id) {
            if (data.has_variants && data.variants && data.variants.length > 0) {
              const userPref = preferences.find(p => p.category_id === data.category_id && !p.is_custom);
              if (userPref && userPref.standard_size) {
                const matchedVariant = data.variants.find((v: any) => v.size === userPref.standard_size);
                if (matchedVariant && matchedVariant.quantity > 0) {
                  setSelectedVariantId(matchedVariant.id);
                }
              } else {
                // Default to first available
                const available = data.variants.find((v: any) => v.quantity > 0);
                if (available) setSelectedVariantId(available.id);
              }
            }
            
            if (data.accepts_custom_size) {
              const customPref = preferences.find(p => p.category_id === data.category_id && p.is_custom);
              if (customPref) {
                setSelectedCustomProfileId(customPref.id);
              }
            }
          } else {
             // Fallback if no category
             if (data.has_variants && data.variants && data.variants.length > 0) {
                const available = data.variants.find((v: any) => v.quantity > 0);
                if (available) setSelectedVariantId(available.id);
             }
          }

          try {
            const historyStr = await AsyncStorage.getItem('@visited_products');
            let history: any[] = historyStr ? JSON.parse(historyStr) : [];
            history = history.filter(item => item.id !== data.id);
            history.unshift({ id: data.id, category_id: data.category_id });
            if (history.length > 20) history = history.slice(0, 20);
            await AsyncStorage.setItem('@visited_products', JSON.stringify(history));
          } catch (e) {
            console.error('Error saving visited product', e);
          }
        }
        
        const favs = await getFavorites();
        setIsFavorite(favs.some((f: any) => f.product_id === id));
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

  const getActiveVariant = () => {
    if (!product || !product.has_variants || !product.variants) return null;
    return product.variants.find(v => v.id === selectedVariantId) || null;
  };

  const getDisplayPrice = () => {
    if (!product) return 0;
    if (useCustomSize && product.custom_size_price) return product.custom_size_price;
    const variant = getActiveVariant();
    if (variant && variant.price) return variant.price;
    return product.price;
  };

  const getDisplayStock = () => {
    if (!product) return 0;
    if (useCustomSize) return 999; // Assume made to order
    const variant = getActiveVariant();
    if (variant) return variant.quantity;
    return product.quantity;
  };

  const openWhatsApp = () => {
    if (!product) return;
    const phone = process.env.EXPO_PUBLIC_WHATSAPP_NUMBER || '+1234567890';
    let text = `Hello, I want to purchase ${product.product_name}.\nUnique Code: ${product.unique_code || 'N/A'}\nQuantity: ${selectedQuantity}`;
    
    if (useCustomSize) {
      const customPref = preferences.find(p => p.id === selectedCustomProfileId);
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
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`);
  };

  if (loading || !product) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF0F3]">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  const displayPrice = getDisplayPrice();
  const displayStock = getDisplayStock();
  const customProfiles = product?.category_id 
    ? preferences.filter(p => p.category_id === product.category_id && p.is_custom) 
    : [];

  return (
    <View className="flex-1 bg-[#FFF0F3]">
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

          <Text className="text-3xl font-extrabold text-[#C25B3E] mb-4">₹{displayPrice}</Text>
          
          <View className="self-start mb-6">
            <Badge 
              label={displayStock > 0 ? (useCustomSize ? 'Made to Order' : `In Stock — ${displayStock} left`) : 'Out of Stock'}
              variant={displayStock > 0 ? 'success' : 'danger'}
              icon={displayStock > 0 ? 'checkmark-circle-outline' : 'close-circle-outline'}
            />
          </View>

          {/* Sizing Section */}
          {(product.has_variants || product.accepts_custom_size) && (
            <View className="mb-6 pt-4 border-t border-slate-100">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-extrabold text-slate-800">
                  {productModelTypeName ? `${productModelTypeName} Sizes` : 'Select Size'}
                </Text>
              </View>

              {product.has_variants && product.variants && (
                <View className="flex-row flex-wrap mb-4">
                  {product.variants.map((variant) => {
                    const isPerfectFit = product.category_id && preferences.some(p => p.category_id === product.category_id && !p.is_custom && p.standard_size === variant.size);
                    const isSelected = !useCustomSize && selectedVariantId === variant.id;
                    const isDisabled = variant.quantity <= 0;
                    
                    return (
                      <TouchableOpacity
                        key={variant.id}
                        disabled={isDisabled}
                        onPress={() => {
                          setSelectedVariantId(variant.id);
                          setUseCustomSize(false);
                        }}
                        className={`mr-3 mb-3 pt-3 pb-2 px-5 rounded-2xl border-2 overflow-hidden ${
                          isSelected 
                            ? 'border-[#FF1F4B] bg-rose-50' 
                            : isDisabled
                              ? 'border-slate-100 bg-slate-50 opacity-50'
                              : 'border-slate-200 bg-white'
                        }`}
                      >
                        {isPerfectFit && (
                          <View className="absolute top-0 right-0 bg-[#FF1F4B] px-1.5 py-0.5 rounded-bl-lg">
                            <Ionicons name="star" size={8} color="white" />
                          </View>
                        )}
                        <Text className={`font-extrabold text-base text-center ${isSelected ? 'text-[#FF1F4B]' : 'text-slate-700'}`}>
                          {variant.size}
                        </Text>
                        {isPerfectFit && (
                          <Text className="text-[9px] font-bold text-[#FF1F4B] mt-0.5 uppercase tracking-tighter">Perfect Fit</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {product.accepts_custom_size && (
                <View className="mt-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm shadow-slate-100">
                  <TouchableOpacity 
                    className="flex-row items-center p-4 bg-slate-50 border-b border-slate-100"
                    onPress={() => setUseCustomSize(!useCustomSize)}
                  >
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${useCustomSize ? 'bg-[#FF1F4B] border-[#FF1F4B]' : 'border-slate-300 bg-white'}`}>
                      {useCustomSize && <View className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </View>
                    <View className="flex-1">
                      <Text className="font-extrabold text-slate-800 text-base">Custom Made to Order</Text>
                      <Text className="text-slate-500 text-xs mt-0.5">We'll craft this perfectly to your measurements.</Text>
                    </View>
                    {product.custom_size_price && (
                      <View className="bg-rose-100 px-2 py-1 rounded-md">
                         <Text className="text-[#FF1F4B] font-bold text-xs">+ ₹{product.custom_size_price}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {useCustomSize && (
                    <View className="p-5">
                      {customProfiles.length > 0 ? (
                        <>
                          <Text className="text-xs text-slate-400 mb-3 font-extrabold uppercase tracking-widest">Select Saved Profile</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {customProfiles.map(p => (
                              <TouchableOpacity
                                key={p.id}
                                onPress={() => setSelectedCustomProfileId(p.id)}
                                className={`mr-3 px-4 py-3 rounded-2xl border-2 ${selectedCustomProfileId === p.id ? 'border-[#FF1F4B] bg-[#FF1F4B]/10' : 'border-slate-100 bg-slate-50'}`}
                              >
                                <View className="flex-row items-center">
                                  <Ionicons name="person-outline" size={14} color={selectedCustomProfileId === p.id ? "#FF1F4B" : "#64748B"} className="mr-1.5" />
                                  <Text className={`text-sm font-extrabold ${selectedCustomProfileId === p.id ? 'text-[#FF1F4B]' : 'text-slate-700'}`}>{p.profile_name}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </>
                      ) : (
                        <View className="items-center bg-rose-50/50 p-4 rounded-2xl border border-dashed border-rose-200">
                          <Ionicons name="cut-outline" size={24} color="#FF1F4B" className="mb-2" />
                          <Text className="text-slate-600 text-center text-sm font-medium mb-3">You don't have any custom measurements saved for this category.</Text>
                          <TouchableOpacity onPress={() => router.push('/profile/size-preferences' as any)} className="bg-[#FF1F4B] px-5 py-2.5 rounded-full">
                            <Text className="text-white font-bold text-xs">Add Measurements Now</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Quantity Selector */}
          {displayStock > 0 && (
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
                  onPress={() => setSelectedQuantity(Math.min(displayStock, selectedQuantity + 1))}
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

          <TouchableOpacity className="flex-row items-center justify-center py-3.5 rounded-2xl border border-rose-100 mb-6 bg-rose-50">
            <Ionicons name="share-social-outline" size={20} color="#e11d48" />
            <Text className="text-rose-600 font-bold ml-2">Share Product</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Action */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/90 px-6 py-4 border-t border-slate-100 pb-8 pt-4">
        <TouchableOpacity 
          className="flex-row items-center justify-center py-4 rounded-2xl shadow-sm"
          style={{ backgroundColor: displayStock > 0 ? '#25D366' : '#94a3b8' }}
          onPress={openWhatsApp}
          disabled={displayStock <= 0}
        >
          <Ionicons name="chatbubble-outline" size={22} color="white" />
          <Text className="text-white font-extrabold text-base ml-2 mr-2">
            {displayStock > 0 ? 'Inquire on WhatsApp' : 'Out of Stock'}
          </Text>
          <Ionicons name="logo-whatsapp" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
