import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import TextInputField from '../../../src/components/TextInputField';
import Button from '../../../src/components/Button';
import { getCategories, Category } from '../../../src/api/categories';
import { createProduct } from '../../../src/api/admin';

export default function AddProductScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories', error);
      }
    };
    fetchCats();
  }, []);

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

    setLoading(true);
    try {
      await createProduct({
        product_name: name,
        price: parseFloat(price),
        description,
        category_id: selectedCategory,
        categoryName: catName,
        quantity: parseInt(quantity, 10),
      }, imageUrls);
      router.replace('/(admin)/add-product/success' as any);
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-4 border-b border-slate-100 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="close" size={24} color="#334155" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Add New Product</Text>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
        {/* Image Upload Area */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {imageUrls.map((uri, idx) => (
            <View key={idx} className="relative mr-4">
              <Image source={{ uri }} className="w-32 h-32 rounded-2xl bg-slate-100" resizeMode="cover" />
              <TouchableOpacity 
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center border-2 border-white"
                onPress={() => removeImage(idx)}
              >
                <Ionicons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity 
            className="w-32 h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 items-center justify-center mr-4"
            onPress={pickImage}
          >
            <Ionicons name="camera-outline" size={32} color="#cbd5e1" />
            <Text className="text-slate-400 font-medium mt-1 text-xs">Add Photo</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Basic Info */}
        <Text className="text-lg font-bold text-slate-800 mb-4">Basic Information</Text>
        <TextInputField
          label="Product Name *"
          placeholder="e.g. Ruby Gold Bangle"
          value={name}
          onChangeText={setName}
        />
        <TextInputField
          label="Price (₹) *"
          placeholder="e.g. 2500"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />
        <TextInputField
          label="Description"
          placeholder="Product details..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        {/* Category Selection */}
        <Text className="text-sm font-bold text-slate-700 mb-2 ml-1">Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {categories.map((cat) => (
            <TouchableOpacity 
              key={cat.id}
              className={`px-4 py-2 rounded-full border mr-3 ${selectedCategory === cat.id ? 'bg-[#FF1F4B] border-[#FF1F4B]' : 'bg-white border-slate-200'}`}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text className={`font-bold ${selectedCategory === cat.id ? 'text-white' : 'text-slate-600'}`}>
                {cat.category_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Inventory Info */}
        <Text className="text-lg font-bold text-slate-800 mb-4">Inventory</Text>
        <TextInputField
          label="Available Quantity"
          placeholder="e.g. 10"
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
        />

        <View className="h-10" />
      </ScrollView>

      {/* Footer Action */}
      <View className="p-4 bg-white border-t border-slate-100">
        <Button 
          title="Add Product" 
          onPress={handleSubmit} 
          loading={loading}
          className="bg-[#FF1F4B]"
        />
      </View>
    </SafeAreaView>
  );
}
