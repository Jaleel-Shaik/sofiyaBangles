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
  const [imageUrl, setImageUrl] = useState('');

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

    if (!imageUrl) {
      Alert.alert('Validation Error', 'Please select an image for the product.');
      return;
    }

    setLoading(true);
    try {
      await createProduct({
        product_name: name,
        price: parseFloat(price),
        description,
        category_id: selectedCategory,
        quantity: parseInt(quantity, 10),
      }, imageUrl);
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
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUrl(result.assets[0].uri);
    }
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
        {/* Image Upload Placeholder */}
        <TouchableOpacity 
          className="w-full h-48 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 items-center justify-center mb-6 overflow-hidden"
          onPress={pickImage}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={40} color="#cbd5e1" />
              <Text className="text-slate-400 font-medium mt-2">Tap to upload image</Text>
            </>
          )}
        </TouchableOpacity>

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
