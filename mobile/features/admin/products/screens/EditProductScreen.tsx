import { View, Text, ScrollView, TouchableOpacity, Image, Alert, TextInput, ActivityIndicator, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import TextInputField from '@/src/components/TextInputField';
import Button from '@/src/components/Button';
import { getCategories, Category } from '@/src/api/categories';
import { getModelTypes, ModelType } from '@/src/api/modelTypes';
import { updateProduct } from '@/src/api/admin';
import { getProductById } from '@/src/api/products';

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [uniqueCode, setUniqueCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedModelType, setSelectedModelType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  
  // Sizing State
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<{ id: string, size: string, price: string, quantity: string }[]>([]);
  const [acceptsCustomSize, setAcceptsCustomSize] = useState(false);
  const [customSizePrice, setCustomSizePrice] = useState('');

  // Category Creation State (Removed inline category creation)

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [cats, mts, productData] = await Promise.all([
            getCategories(), 
            getModelTypes(),
            id ? getProductById(id as string) : Promise.resolve(null)
          ]);
          setCategories(cats);
          setModelTypes(mts);
          
          if (productData) {
            setName(productData.product_name || '');
            setPrice(productData.price ? productData.price.toString() : '');
            setDescription(productData.description || '');
            setQuantity(productData.quantity ? productData.quantity.toString() : '0');
            setUniqueCode(productData.unique_code || '');
            setIsActive(productData.is_active !== false);
            
            const cat = cats.find(c => c.id === productData.category_id);
            if (cat) {
              setSelectedModelType(cat.model_type_id || '');
              setSelectedCategory(cat.id);
            }
            
            setImageUrls(productData.images || (productData.image_url ? [productData.image_url] : []));
            
            if (productData.variants && productData.variants.length > 0) {
              setVariants(productData.variants.map((v: any) => ({
                id: v.id || `v-${Math.random()}`,
                size: v.size,
                price: v.price.toString(),
                quantity: v.quantity.toString()
              })));
            }
            
            if (productData.accepts_custom_size) {
              setAcceptsCustomSize(true);
              setCustomSizePrice(productData.custom_size_price ? productData.custom_size_price.toString() : '');
            }
          }
        } catch (error) {
          console.error('Failed to load data', error);
          Alert.alert("Error", "Could not load product details.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [id])
  );

  const filteredCategories = useMemo(() => {
    if (!selectedModelType) return [];
    return categories.filter(c => c.model_type_id === selectedModelType);
  }, [categories, selectedModelType]);

  const currentCategory = useMemo(() => categories.find(c => c.id === selectedCategory), [categories, selectedCategory]);

  // Only clear category if selectedModelType changes AFTER initial load
  // To prevent clearing category when product data is first loaded, we won't reset it here
  // Instead, the user manually selecting a model type will require selecting a category.

  useEffect(() => {
    if (!currentCategory) return;
    
    // Only populate variants from category if variants state is currently empty (meaning it's not loaded from product)
    if (variants.length === 0) {
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
    } else {
      setHasVariants(true);
    }

    if (currentCategory.size_type === 'custom' || currentCategory.size_type === 'both') {
      setAcceptsCustomSize(true);
      if (!customSizePrice) setCustomSizePrice(price);
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
      await updateProduct(id as string, {
        product_name: name,
        price: parseFloat(price),
        description,
        category_id: selectedCategory,
        categoryName: catName,
        quantity: parseInt(quantity, 10) || 0,
        unique_code: uniqueCode,
        is_active: isActive,
        has_variants: hasVariants,
        variants: JSON.stringify(parsedVariants),
        accepts_custom_size: acceptsCustomSize,
        custom_size_price: parseFloat(customSizePrice) || parseFloat(price)
      }, imageUrls);
      Alert.alert('Success', 'Product updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update product');
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
            <Text className="text-2xl font-bold text-text-primary">Edit Product</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Images Section */}
        <View className="mb-6">
          <Text className="text-sm font-bold text-text-secondary mb-3 ml-1">Product Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-1 py-1">
            <TouchableOpacity 
              className="w-40 h-40 bg-surface rounded-2xl border-2 border-dashed border-primary/30 items-center justify-center mr-4"
              onPress={pickImage}
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
          <TextInputField label="Product Name *" placeholder="e.g. Ruby Gold Bangle" value={name} onChangeText={setName} />
          <TextInputField label="Base Price (₹) *" placeholder="e.g. 2500" keyboardType="numeric" value={price} onChangeText={(val) => {
            setPrice(val);
            setCustomSizePrice(val);
          }} />
          <TextInputField label="Description" placeholder="Product details..." value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
          <TextInputField label="Unique Code" placeholder="Auto-generated if empty" value={uniqueCode} onChangeText={setUniqueCode} />

          {/* Active Toggle */}
          <View className="flex-row items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/20 mt-2">
            <View className="flex-row items-center">
              <Ionicons name={isActive ? "globe" : "eye-off-outline"} size={18} color={isActive ? "#22c55e" : "#94a3b8"} />
              <Text className="text-text-primary font-bold ml-2">{isActive ? 'Published' : 'Draft'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsActive(!isActive)}
              className={`w-14 h-7 rounded-full px-0.5 flex-row items-center ${isActive ? 'bg-success justify-end' : 'bg-slate-300 justify-start'}`}
            >
              <View className="w-6 h-6 bg-white rounded-full shadow-sm" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categorization Card */}
        <View className="bg-surface p-5 rounded-2xl mb-6 border border-divider">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
              <Ionicons name="grid" size={16} color="#e11d48" />
            </View>
            <Text className="text-lg font-bold text-text-primary">Categorization</Text>
          </View>
          <Text className="text-sm font-bold text-text-secondary mb-3 ml-1">Model Type *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {modelTypes.map((mt) => (
            <TouchableOpacity 
              key={mt.id}
              className={`px-4 py-2 rounded-full border mr-3 ${selectedModelType === mt.id ? 'bg-primary border-primary' : 'bg-surface border-divider'}`}
              onPress={() => {
                setSelectedModelType(mt.id);
                setSelectedCategory('');
              }}
            >
              <Text className={`font-bold ${selectedModelType === mt.id ? 'text-white' : 'text-text-secondary'}`}>
                {mt.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedModelType ? (
          <>
            <Text className="text-sm font-bold text-text-secondary mb-2 ml-1">Select Category *</Text>
            <View className="mb-4">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => {
                  const mt = modelTypes.find(m => m.id === cat.model_type_id);
                  const isSelected = selectedCategory === cat.id;
                  
                  return (
                    <TouchableOpacity 
                      key={cat.id}
                      className={`p-4 rounded-2xl mb-3 border flex-row items-center ${isSelected ? 'bg-primary/5 border-primary' : 'bg-surface border-divider'}`}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <View className="w-20 h-20 rounded-2xl bg-surface mr-4 border border-divider overflow-hidden">
                        {cat.image_url ? (
                          <Image source={{ uri: cat.image_url }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <Ionicons name="folder-outline" size={24} color="#94a3b8" />
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className={`text-lg font-bold ${isSelected ? 'text-primary' : 'text-text-primary'}`}>{cat.category_name}</Text>
                        {mt && (
                          <View className="flex-row items-center mt-1">
                            <Ionicons name="layers-outline" size={14} color="#64748b" />
                            <Text className="text-text-secondary text-xs font-bold ml-1">{mt.name}</Text>
                            {cat.size_type && (
                              <View className={`${isSelected ? 'bg-primary/10' : 'bg-surface'} px-1.5 py-0.5 rounded-md ml-2 border border-divider`}>
                                <Text className={`text-[9px] font-bold uppercase ${isSelected ? 'text-primary' : 'text-text-secondary'}`}>{cat.size_type}</Text>
                              </View>
                            )}
                          </View>
                        )}
                        {(cat.size_type === 'standard' || cat.size_type === 'both') && cat.standard_sizes && cat.standard_sizes.length > 0 && (
                          <Text className="text-xs text-text-hint mt-1">Sizes: {cat.standard_sizes.join(', ')}</Text>
                        )}
                        {(cat.size_type === 'custom' || cat.size_type === 'both') && cat.custom_measurement_fields && cat.custom_measurement_fields.length > 0 && (
                          <Text className="text-xs text-text-hint mt-1">Custom: {cat.custom_measurement_fields.join(', ')}</Text>
                        )}
                      </View>
                      
                      {isSelected && (
                        <View className="w-8 h-8 bg-primary rounded-full items-center justify-center ml-2">
                          <Ionicons name="checkmark" size={16} color="white" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text className="text-text-secondary italic ml-1">No categories found for this model type.</Text>
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
        
        {selectedCategory && currentCategory && currentCategory.size_type && (() => {
          const cat = currentCategory;
          return (
            <View className="mb-5 bg-surface p-4 rounded-2xl border border-divider">
              <View className="flex-row items-center mb-2">
                <Ionicons name="information-circle" size={18} color="#64748b" />
                <Text className="text-sm font-bold text-text-secondary ml-2">Sizing from: <Text className="text-text-primary">{cat.category_name}</Text></Text>
              </View>
              <View className="flex-row flex-wrap">
                <View className={`px-3 py-1 rounded-lg mr-2 ${cat.size_type === 'none' ? 'bg-surface border border-divider' : 'bg-primary/10'}`}>
                  <Text className={`text-xs font-bold uppercase ${cat.size_type === 'none' ? 'text-text-hint' : 'text-primary'}`}>{cat.size_type === 'none' ? 'No Sizes' : cat.size_type}</Text>
                </View>
                {(cat.size_type === 'standard' || cat.size_type === 'both') && cat.standard_sizes && cat.standard_sizes.length > 0 && (
                  <Text className="text-xs text-text-secondary font-medium self-center">Sizes: {cat.standard_sizes.join(', ')}</Text>
                )}
              </View>
              {(cat.size_type === 'custom' || cat.size_type === 'both') && cat.custom_measurement_fields && cat.custom_measurement_fields.length > 0 && (
                <Text className="text-xs text-text-secondary mt-2 font-medium">Fields: {cat.custom_measurement_fields.join(', ')}</Text>
              )}
            </View>
          );
        })()}

        {!hasVariants ? (
          <TextInputField label="Total Available Quantity" placeholder="e.g. 10" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
        ) : (
          <View className="mb-6">
            <Text className="text-sm font-bold text-text-secondary mb-2 ml-1">Size Variants — Set Price & Quantity Per Size</Text>
            {variants.map((v) => (
              <View key={v.id} className="flex-row items-center bg-surface p-3 rounded-xl border border-divider mb-2">
                <View className="bg-primary px-3 py-1.5 rounded-lg mr-3 min-w-[48px] items-center">
                  <Text className="font-bold text-white">{v.size}</Text>
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-[10px] text-text-hint font-bold mb-0.5 uppercase">Price (₹)</Text>
                  <TextInput 
                    placeholder="Price" 
                    value={v.price} 
                    onChangeText={(val) => updateVariant(v.id, 'price', val)} 
                    keyboardType="numeric" 
                    className="bg-surface border border-divider rounded-lg px-3 py-2 text-text-primary" 
                  />
                </View>
                <View className="w-20">
                  <Text className="text-[10px] text-text-hint font-bold mb-0.5 uppercase">Qty</Text>
                  <TextInput 
                    placeholder="Qty" 
                    value={v.quantity} 
                    onChangeText={(val) => updateVariant(v.id, 'quantity', val)} 
                    keyboardType="numeric" 
                    className="bg-surface border border-divider rounded-lg px-3 py-2 text-text-primary" 
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {acceptsCustomSize && (
          <View className="mb-6 bg-primary/5 p-4 rounded-2xl border border-primary/20">
            <View className="flex-row items-center mb-2">
              <Ionicons name="cut-outline" size={18} color="#e11d48" />
              <Text className="font-bold text-text-primary ml-2">Custom Measurements Enabled</Text>
            </View>
            <Text className="text-xs text-text-secondary mb-3">Customers can enter their own measurements ({(() => {
              return currentCategory?.custom_measurement_fields?.join(', ') || 'custom fields';
            })()}) when ordering this product.</Text>
            <TextInputField label="Custom Size Price (₹)" placeholder="e.g. 3000" keyboardType="numeric" value={customSizePrice} onChangeText={setCustomSizePrice} />
          </View>
        )}
        </View>

        <View className="h-32" />
      </ScrollView>

      <View className="p-5 bg-surface border-t border-divider" style={{ paddingBottom: Math.max(insets.bottom + 16, 24) }}>
        <Button title="Save Product" onPress={handleSubmit} loading={loading} className="bg-primary py-4 rounded-full" />
      </View>
    </View>
  );
}
