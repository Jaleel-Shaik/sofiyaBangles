import { View, Text, ScrollView, TouchableOpacity, Image, Alert, TextInput, ActivityIndicator, Switch, Modal } from 'react-native';
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
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModelPicker, setShowModelPicker] = useState(false);
  
  // Sizing State
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<{ id: string, size: string, price: string, quantity: string }[]>([]);
  const [acceptsCustomSize, setAcceptsCustomSize] = useState(false);
  const [customSizePrice, setCustomSizePrice] = useState('');

  // Category Creation State (Removed inline category creation)

  useFocusEffect(
    useCallback(() => {
      const fetchModels = async () => {
        try {
          const mts = await getModelTypes();
          setModelTypes(mts);
          if (mts.length > 0 && !selectedModelType) {
            setSelectedModelType(mts[0].id);
          }
        } catch (error) {
          console.error('Failed to load model types', error);
        }
      };
      fetchModels();
    }, [])
  );

  useEffect(() => {
    const fetchCats = async () => {
      if (selectedModelType) {
        try {
          const cats = await getCategories(selectedModelType);
          setCategories(cats);
        } catch (error) {
          setCategories([]);
        }
      } else {
        setCategories([]);
      }
    };
    fetchCats();
  }, [selectedModelType]);

  const filteredCategories = categories;

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
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!price) newErrors.price = 'Price is required';
    else if (parseFloat(price) <= 0) newErrors.price = 'Price must be a positive number';
    if (!selectedModelType) newErrors.model_type_id = 'Model Type is required';
    if (!selectedCategory) newErrors.category = 'Category is required';
    if (imageUrls.length === 0) newErrors.images = 'At least one image is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }
    setErrors({});

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
        model_type_id: selectedModelType,
        quantity: parseInt(quantity, 10) || 0,
        is_active: isActive,
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
    <View className="flex-1 bg-surface">
      <View 
        className="px-6 pb-6 bg-surface rounded-b-[32px] flex-row items-center justify-between z-10 border-b border-divider"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity 
            className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4 border border-divider"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#e11d48" />
          </TouchableOpacity>
          <View>
            <Text className="text-primary font-semibold text-xs uppercase tracking-widest mb-1">Admin Space</Text>
            <Text className="text-2xl font-bold text-text-primary">Add Product</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        
        {/* Images Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3 ml-1">
            <Text className="text-sm font-bold text-text-secondary">Product Images</Text>
            {errors.images && <Text className="text-xs font-bold text-red-500">{errors.images}</Text>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-1 py-1">
            <TouchableOpacity 
              className={`w-40 h-40 bg-surface rounded-2xl border-2 border-dashed items-center justify-center mr-4 ${
                errors.images ? 'border-red-500 bg-red-50/10' : 'border-primary/30'
              }`}
              onPress={() => {
                pickImage();
                if (errors.images) setErrors(prev => { const copy = { ...prev }; delete copy.images; return copy; });
              }}
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mb-2">
                <Ionicons name="camera" size={24} color="#e11d48" />
              </View>
              <Text className="text-primary font-semibold text-xs">Add Photos</Text>
            </TouchableOpacity>
            
            {imageUrls.map((uri, idx) => (
              <View key={idx} className="relative mr-4">
                <Image source={{ uri }} className="w-40 h-40 rounded-2xl bg-surface" resizeMode="cover" />
                <TouchableOpacity 
                  className="absolute -top-2 -right-2 bg-text-primary rounded-full w-8 h-8 items-center justify-center border-2 border-surface"
                  onPress={() => removeImage(idx)}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Basic Info Card */}
        <View className="bg-surface p-5 rounded-2xl mb-6 border border-divider">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
              <Ionicons name="document-text" size={16} color="#e11d48" />
            </View>
            <Text className="text-lg font-bold text-text-primary">Basic Details</Text>
          </View>
          
          <TextInputField 
            label="Product Name *" 
            placeholder="e.g. Royal Diamond Bangle" 
            value={name} 
            onChangeText={(val) => {
              setName(val);
              if (errors.name) setErrors(prev => { const copy = { ...prev }; delete copy.name; return copy; });
            }} 
            error={errors.name}
          />
          
          <TextInputField 
            label="Base Price (₹) *" 
            placeholder="e.g. 2500" 
            keyboardType="numeric" 
            value={price} 
            onChangeText={(val) => {
              setPrice(val);
              setCustomSizePrice(val);
              if (errors.price) setErrors(prev => { const copy = { ...prev }; delete copy.price; return copy; });
            }} 
            error={errors.price}
          />
          
          <TextInputField label="Description" placeholder="Write a beautiful description..." value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ height: 100, textAlignVertical: 'top' }} />
        </View>

        {/* Categorization Card */}
        <View className="bg-surface p-5 rounded-2xl mb-6 border border-divider">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
              <Ionicons name="grid" size={16} color="#e11d48" />
            </View>
            <Text className="text-lg font-bold text-text-primary">Categorization</Text>
          </View>

          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-sm font-bold text-text-secondary">Model Type *</Text>
            {errors.model_type_id && <Text className="text-xs font-bold text-red-500">{errors.model_type_id}</Text>}
          </View>
          <TouchableOpacity 
            className={`flex-row items-center justify-between p-4 rounded-2xl border mb-4 bg-white ${
              errors.model_type_id ? 'border-red-500 bg-red-50/10' : 'border-divider'
            }`}
            onPress={() => setShowModelPicker(true)}
            activeOpacity={0.8}
          >
            <Text className={`text-base ${selectedModelType ? 'text-text-primary font-bold' : 'text-slate-400'}`}>
              {modelTypes.find(mt => mt.id === selectedModelType)?.name || 'Select Model Type'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#94a3b8" />
          </TouchableOpacity>

          {selectedModelType ? (
            <>
              <View className="flex-row items-center justify-between mb-3 px-1 mt-2">
                <View className="flex-row items-center">
                  <Text className="text-sm font-bold text-text-secondary">Select Category *</Text>
                  {errors.category && <Text className="text-xs font-bold text-red-500"> - {errors.category}</Text>}
                </View>
                <TouchableOpacity 
                  onPress={() => router.push('/(admin)/(tabs)/categories' as any)}
                  className="bg-primary/10 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-xs font-bold text-primary">+ Add New</Text>
                </TouchableOpacity>
              </View>
              
              <View className="mb-2">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <TouchableOpacity 
                        key={cat.id}
                        className={`p-4 rounded-2xl mb-3 border-2 ${
                          isSelected 
                            ? 'bg-primary/5 border-primary' 
                            : errors.category 
                              ? 'bg-red-50/5 border-red-300' 
                              : 'bg-surface border-divider'
                        }`}
                        onPress={() => {
                          setSelectedCategory(cat.id);
                          if (errors.category) setErrors(prev => { const copy = { ...prev }; delete copy.category; return copy; });
                        }}
                        activeOpacity={0.8}
                      >
                        <View className="flex-row items-center">
                          <View className="w-20 h-20 rounded-2xl bg-surface mr-4 border border-divider overflow-hidden">
                            {cat.image_url ? (
                              <Image source={{ uri: cat.image_url }} className="w-full h-full" resizeMode="cover" />
                            ) : (
                              <View className="flex-1 items-center justify-center">
                                <Ionicons name="folder-outline" size={20} color="#94a3b8" />
                              </View>
                            )}
                          </View>
                          <View className="flex-1">
                            <Text className={`text-base font-bold ${isSelected ? 'text-primary' : 'text-text-primary'}`}>{cat.category_name}</Text>
                            
                            {(cat.size_type && cat.size_type !== 'none') && (
                                <View className="flex-row items-center mt-1.5">
                                  <View className="bg-surface px-2 py-1 rounded-md border border-divider">
                                    <Text className="text-[10px] font-bold text-text-secondary uppercase">{cat.size_type} Sizing</Text>
                                  </View>
                                </View>
                            )}
                          </View>
                          
                          <View className={`w-6 h-6 rounded-full items-center justify-center border ${isSelected ? 'bg-primary border-primary' : 'bg-surface border-divider'}`}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View className="bg-surface p-6 rounded-2xl items-center border border-divider border-dashed">
                    <Ionicons name="folder-open-outline" size={32} color="#cbd5e1" />
                    <Text className="text-text-hint font-medium mt-2">No categories found for this model.</Text>
                  </View>
                )}
              </View>
            </>
          ) : null}
        </View>
        
        {/* Inventory & Sizing Card */}
        <View className="bg-surface p-5 rounded-2xl mb-6 border border-divider">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
              <Ionicons name="layers" size={16} color="#e11d48" />
            </View>
            <Text className="text-lg font-bold text-text-primary">Inventory & Sizing</Text>
          </View>
          
          {!hasVariants ? (
            <TextInputField label="Total Available Quantity" placeholder="e.g. 10" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
          ) : (
            <View className="mb-4">
              <Text className="text-sm font-bold text-text-secondary mb-3 ml-1">Size Variants</Text>
              {variants.map((v) => (
                <View key={v.id} className="flex-row items-center bg-surface p-3 rounded-2xl border border-divider mb-3">
                  <View className="bg-surface border border-divider px-4 py-3 rounded-xl mr-3 items-center justify-center">
                    <Text className="font-bold text-primary text-lg">{v.size}</Text>
                  </View>
                  <View className="flex-1 mr-2">
                    <Text className="text-[10px] text-text-secondary font-bold mb-1 uppercase ml-1">Price (₹)</Text>
                    <TextInput 
                      placeholder="Price" 
                      value={v.price} 
                      onChangeText={(val) => updateVariant(v.id, 'price', val)} 
                      keyboardType="numeric" 
                      className="bg-surface border border-divider rounded-xl px-4 py-2.5 text-text-primary font-semibold" 
                    />
                  </View>
                  <View className="w-24">
                    <Text className="text-[10px] text-text-secondary font-bold mb-1 uppercase ml-1">Stock</Text>
                    <TextInput 
                      placeholder="Qty" 
                      value={v.quantity} 
                      onChangeText={(val) => updateVariant(v.id, 'quantity', val)} 
                      keyboardType="numeric" 
                      className="bg-surface border border-divider rounded-xl px-4 py-2.5 text-text-primary font-semibold" 
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {acceptsCustomSize && (
            <View className="mt-2 bg-primary/5 p-5 rounded-2xl border border-primary/20">
              <View className="flex-row items-center mb-2">
                <Ionicons name="cut" size={18} color="#e11d48" />
                <Text className="font-bold text-primary ml-2 text-base">Custom Measurements</Text>
              </View>
              <Text className="text-xs text-text-secondary mb-4 font-medium leading-5">Customers can enter their own measurements ({(() => {
                return currentCategory?.custom_measurement_fields?.join(', ') || 'custom fields';
              })()}) when ordering this product.</Text>
              <View className="bg-surface p-1 rounded-2xl">
                <TextInputField label="Custom Size Price (₹)" placeholder="e.g. 3000" keyboardType="numeric" value={customSizePrice} onChangeText={setCustomSizePrice} />
              </View>
            </View>
          )}
        </View>

        <View className="h-32" />
      </ScrollView>

      <View className="p-5 bg-surface border-t border-divider" style={{ paddingBottom: Math.max(insets.bottom + 16, 24) }}>
        <Button 
          title="Create Product"
          onPress={handleSubmit} 
          loading={loading} 
          className="bg-primary py-4 rounded-full" 
        />
      </View>

      {/* Model Type Selector Modal */}
      <Modal visible={showModelPicker} transparent animationType="slide" onRequestClose={() => setShowModelPicker(false)}>
        <TouchableOpacity 
          className="flex-1 bg-black/50 justify-end" 
          activeOpacity={1} 
          onPress={() => setShowModelPicker(false)}
        >
          <View className="bg-white rounded-t-[32px] p-6 max-h-[70%]">
            <View className="flex-row items-center justify-between mb-6 pb-2 border-b border-divider">
              <Text className="text-xl font-bold text-text-primary">Select Model Type</Text>
              <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {modelTypes.map((mt) => {
                const isSelected = selectedModelType === mt.id;
                return (
                  <TouchableOpacity
                    key={mt.id}
                    className={`flex-row items-center justify-between p-4 rounded-2xl mb-3 border ${
                      isSelected ? 'bg-primary/5 border-primary' : 'bg-surface border-divider'
                    }`}
                    onPress={() => {
                      setSelectedModelType(mt.id);
                      setSelectedCategory('');
                      setShowModelPicker(false);
                      if (errors.model_type_id) {
                        setErrors(prev => { const copy = { ...prev }; delete copy.model_type_id; return copy; });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-base font-bold ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                      {mt.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#e11d48" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
