import { View, Text, ScrollView, TouchableOpacity, Image, Alert, TextInput, ActivityIndicator, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import TextInputField from '@/src/components/TextInputField';
import Button from '@/src/components/Button';
import { getCategories, Category } from '@/src/api/categories';
import { getModelTypes, ModelType } from '@/src/api/modelTypes';
import { createProduct } from '@/src/api/admin';

export default function AddProductScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [selectedModelType, setSelectedModelType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  
  // Sizing State
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<Array<{ id: string, size: string, price: string, quantity: string }>>([]);
  const [acceptsCustomSize, setAcceptsCustomSize] = useState(false);
  const [customSizePrice, setCustomSizePrice] = useState('');

  // Category Creation State (Removed inline category creation)

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const [cats, mts] = await Promise.all([getCategories(), getModelTypes()]);
          setCategories(cats);
          setModelTypes(mts);
        } catch (error) {
          console.error('Failed to load data', error);
        }
      };
      fetchData();
    }, [])
  );

  const filteredCategories = useMemo(() => {
    if (!selectedModelType) return [];
    return categories.filter(c => c.model_type_id === selectedModelType);
  }, [categories, selectedModelType]);

  const currentCategory = useMemo(() => categories.find(c => c.id === selectedCategory), [categories, selectedCategory]);

  // Reset category if model type changes
  useEffect(() => {
    setSelectedCategory('');
  }, [selectedModelType]);

  useEffect(() => {
    setHasVariants(false);
    setAcceptsCustomSize(false);
    setVariants([]);
    if (currentCategory) {
      if (currentCategory.size_type === 'standard' || currentCategory.size_type === 'both') {
        setHasVariants(true);
        if (currentCategory.standard_sizes) {
          setVariants(currentCategory.standard_sizes.map(sz => ({
            id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            size: sz,
            price: price || '0',
            quantity: quantity || '0'
          })));
        }
      }
      if (currentCategory.size_type === 'custom' || currentCategory.size_type === 'both') {
        setAcceptsCustomSize(true);
        setCustomSizePrice(price);
      }
    }
  }, [currentCategory, price, quantity]);



  const handleSubmit = async () => {
    if (!name || !price || !selectedCategory) {
      Alert.alert('Validation Error', 'Please fill in all required fields (Name, Price, Category).');
      return;
    }
    if (imageUrls.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one image for the product.');
      return;
    }

    const catName = categories.find(c => c.id === selectedCategory)?.category_name || 'PRD';

    const parsedVariants = variants.map(v => ({
      id: v.id,
      size: v.size,
      price: parseFloat(v.price) || 0,
      quantity: parseInt(v.quantity, 10) || 0
    }));

    setLoading(true);
    try {
      await createProduct({
        product_name: name,
        price: parseFloat(price),
        description,
        category_id: selectedCategory,
        categoryName: catName,
        quantity: parseInt(quantity, 10) || 0,
        has_variants: hasVariants,
        variants: JSON.stringify(parsedVariants),
        accepts_custom_size: acceptsCustomSize,
        custom_size_price: parseFloat(customSizePrice) || parseFloat(price)
      }, imageUrls);
      router.replace('/(admin)/(tabs)/add-success' as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add product');


    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedUris = result.assets.map(a => a.uri);
      setImageUrls(prev => [...prev, ...selectedUris]);
    }
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (id: string, field: 'price' | 'quantity', value: string) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };


  return (
    <View className="flex-1 bg-[#FFF0F3]">
      {/* Header */}
      <View 
        className="px-6 pb-6 bg-white rounded-b-[40px] shadow-sm flex-row items-center justify-between z-10 border-b border-slate-100"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity 
            className="w-12 h-12 bg-rose-50 rounded-full items-center justify-center mr-4"
            onPress={() => router.push('/(tabs)/profile' as any)}
          >
            <Ionicons name="arrow-back" size={24} color="#FF1F4B" />
          </TouchableOpacity>
          <View>
            <Text className="text-[#FF1F4B] font-semibold text-xs uppercase tracking-widest mb-1">Admin Space</Text>
            <Text className="text-2xl font-extrabold text-slate-800 font-serif">Add Product</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
        
        {/* Images Section */}
        <View className="mb-6">
          <Text className="text-sm font-bold text-slate-700 mb-3 ml-1">Product Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-1 py-1">
            <TouchableOpacity 
              className="w-32 h-32 bg-white rounded-3xl border-2 border-dashed border-rose-200 items-center justify-center mr-4 shadow-sm"
              onPress={pickImage}
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 bg-rose-50 rounded-full items-center justify-center mb-2">
                <Ionicons name="camera" size={24} color="#FF1F4B" />
              </View>
              <Text className="text-[#FF1F4B] font-semibold text-xs">Add Photos</Text>
            </TouchableOpacity>
            
            {imageUrls.map((uri, idx) => (
              <View key={idx} className="relative mr-4">
                <Image source={{ uri }} className="w-32 h-32 rounded-3xl bg-white shadow-sm" resizeMode="cover" />
                <TouchableOpacity 
                  className="absolute -top-2 -right-2 bg-slate-800 rounded-full w-8 h-8 items-center justify-center border-2 border-white shadow-md"
                  onPress={() => removeImage(idx)}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Basic Info Card */}
        <View className="bg-white p-5 rounded-3xl shadow-sm mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-rose-50 rounded-full items-center justify-center mr-3">
              <Ionicons name="document-text" size={16} color="#FF1F4B" />
            </View>
            <Text className="text-lg font-bold text-slate-800">Basic Details</Text>
          </View>
          
          <TextInputField label="Product Name *" placeholder="e.g. Royal Diamond Bangle" value={name} onChangeText={setName} />
          
          <TextInputField label="Base Price (₹) *" placeholder="e.g. 2500" keyboardType="numeric" value={price} onChangeText={(val) => {
            setPrice(val);
            setCustomSizePrice(val);
          }} />
          
          <TextInputField label="Description" placeholder="Write a beautiful description..." value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ height: 100, textAlignVertical: 'top' }} />
        </View>

        {/* Categorization Card */}
        <View className="bg-white p-5 rounded-3xl shadow-sm mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mr-3">
              <Ionicons name="grid" size={16} color="#3b82f6" />
            </View>
            <Text className="text-lg font-bold text-slate-800">Categorization</Text>
          </View>

          <Text className="text-sm font-bold text-slate-700 mb-3 ml-1">Model Type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            {modelTypes.map((mt) => (
              <TouchableOpacity 
                key={mt.id}
                className={`px-5 py-3 rounded-full mr-3 shadow-sm border ${selectedModelType === mt.id ? 'bg-[#FF1F4B] border-[#FF1F4B]' : 'bg-slate-50 border-slate-100'}`}
                onPress={() => setSelectedModelType(mt.id)}
                activeOpacity={0.8}
              >
                <Text className={`font-bold ${selectedModelType === mt.id ? 'text-white' : 'text-slate-600'}`}>
                  {mt.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedModelType ? (
            <>
              <View className="flex-row items-center justify-between mb-3 px-1 mt-2">
                <Text className="text-sm font-bold text-slate-700">Select Category *</Text>
                <TouchableOpacity 
                  onPress={() => router.push('/(admin)/(tabs)/categories' as any)}
                  className="bg-rose-50 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-xs font-bold text-[#FF1F4B]">+ Add New</Text>
                </TouchableOpacity>
              </View>
              
              <View className="mb-2">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <TouchableOpacity 
                        key={cat.id}
                        className={`p-4 rounded-2xl mb-3 border-2 transition-all ${isSelected ? 'bg-rose-50 border-[#FF1F4B]' : 'bg-slate-50 border-transparent'}`}
                        onPress={() => setSelectedCategory(cat.id)}
                        activeOpacity={0.8}
                      >
                        <View className="flex-row items-center">
                          <View className="w-14 h-14 rounded-2xl bg-white mr-4 border border-slate-100 overflow-hidden shadow-sm">
                            {cat.image_url ? (
                              <Image source={{ uri: cat.image_url }} className="w-full h-full" resizeMode="cover" />
                            ) : (
                              <View className="flex-1 items-center justify-center">
                                <Ionicons name="folder-outline" size={20} color="#94a3b8" />
                              </View>
                            )}
                          </View>
                          <View className="flex-1">
                            <Text className={`text-base font-extrabold ${isSelected ? 'text-[#FF1F4B]' : 'text-slate-800'}`}>{cat.category_name}</Text>
                            
                            {(cat.size_type && cat.size_type !== 'none') && (
                                <View className="flex-row items-center mt-1.5">
                                  <View className="bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                                    <Text className="text-[10px] font-bold text-slate-500 uppercase">{cat.size_type} Sizing</Text>
                                  </View>
                                </View>
                            )}
                          </View>
                          
                          <View className={`w-6 h-6 rounded-full items-center justify-center border ${isSelected ? 'bg-[#FF1F4B] border-[#FF1F4B]' : 'bg-white border-slate-300'}`}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View className="bg-slate-50 p-6 rounded-2xl items-center border border-slate-100 border-dashed">
                    <Ionicons name="folder-open-outline" size={32} color="#cbd5e1" />
                    <Text className="text-slate-400 font-medium mt-2">No categories found for this model.</Text>
                  </View>
                )}
              </View>
            </>
          ) : null}
        </View>
        
        {/* Inventory & Sizing Card */}
        <View className="bg-white p-5 rounded-3xl shadow-sm mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-emerald-50 rounded-full items-center justify-center mr-3">
              <Ionicons name="layers" size={16} color="#10b981" />
            </View>
            <Text className="text-lg font-bold text-slate-800">Inventory & Sizing</Text>
          </View>
          
          {!hasVariants ? (
            <TextInputField label="Total Available Quantity" placeholder="e.g. 10" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
          ) : (
            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-700 mb-3 ml-1">Size Variants</Text>
              {variants.map((v) => (
                <View key={v.id} className="flex-row items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-3">
                  <View className="bg-white border border-slate-200 px-4 py-3 rounded-xl mr-3 items-center justify-center shadow-sm">
                    <Text className="font-extrabold text-[#FF1F4B] text-lg">{v.size}</Text>
                  </View>
                  <View className="flex-1 mr-2">
                    <Text className="text-[10px] text-slate-500 font-bold mb-1 uppercase ml-1">Price (₹)</Text>
                    <TextInput 
                      placeholder="Price" 
                      value={v.price} 
                      onChangeText={(val) => updateVariant(v.id, 'price', val)} 
                      keyboardType="numeric" 
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-semibold shadow-sm" 
                    />
                  </View>
                  <View className="w-24">
                    <Text className="text-[10px] text-slate-500 font-bold mb-1 uppercase ml-1">Stock</Text>
                    <TextInput 
                      placeholder="Qty" 
                      value={v.quantity} 
                      onChangeText={(val) => updateVariant(v.id, 'quantity', val)} 
                      keyboardType="numeric" 
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-semibold shadow-sm" 
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {acceptsCustomSize && (
            <View className="mt-2 bg-rose-50 p-5 rounded-2xl border border-rose-100">
              <View className="flex-row items-center mb-2">
                <Ionicons name="cut" size={18} color="#FF1F4B" />
                <Text className="font-bold text-[#FF1F4B] ml-2 text-base">Custom Measurements</Text>
              </View>
              <Text className="text-xs text-rose-600/80 mb-4 font-medium leading-5">Customers can enter their own measurements ({(() => {
                return currentCategory?.custom_measurement_fields?.join(', ') || 'custom fields';
              })()}) when ordering this product.</Text>
              <View className="bg-white p-1 rounded-2xl">
                <TextInputField label="Custom Size Price (₹)" placeholder="e.g. 3000" keyboardType="numeric" value={customSizePrice} onChangeText={setCustomSizePrice} />
              </View>
            </View>
          )}
        </View>

        <View className="h-28" />
      </ScrollView>

      {/* Floating Action Button area */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white/90 border-t border-slate-100/50" style={{ paddingBottom: Math.max(insets.bottom + 16, 24) }}>
        <Button 
          title="Publish Product" 
          onPress={handleSubmit} 
          loading={loading} 
          className="bg-[#FF1F4B] shadow-lg py-4 rounded-full" 
          style={{ 
            shadowColor: '#FF1F4B', 
            shadowOffset: { width: 0, height: 6 }, 
            shadowOpacity: 0.3, 
            shadowRadius: 10, 
            elevation: 8 
          }}
        />
      </View>
    </View>
  );
}
