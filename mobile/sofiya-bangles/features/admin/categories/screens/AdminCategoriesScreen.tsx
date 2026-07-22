import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCategories, Category } from '@/src/api/categories';
import { getModelTypes, ModelType } from '@/src/api/modelTypes';
import { createCategoryWithImage, createModelType, updateCategoryWithImage, deleteCategory } from '@/src/api/admin';
import * as ImagePicker from 'expo-image-picker';

export default function ManageCategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [selectedModelTypeId, setSelectedModelTypeId] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // New Model Type Form State
  const [isCreatingNewModel, setIsCreatingNewModel] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelStandardSizes, setNewModelStandardSizes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cats, mts] = await Promise.all([getCategories(), getModelTypes()]);
      setCategories(cats);
      setModelTypes(mts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setName(cat.category_name);
    setSelectedModelTypeId(cat.model_type_id || '');
    setImageUri(cat.image_url || null);
    
    // Set sizes
    if (cat.standard_sizes) setNewModelStandardSizes(cat.standard_sizes.join(', '));
    else setNewModelStandardSizes('');
    
    setIsCreatingNewModel(false);
    setIsAdding(true);
  };

  const handleDeleteCategory = (catId: string) => {
    Alert.alert(
      "Delete Category",
      "Are you sure you want to delete this category? This might affect products associated with it.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await deleteCategory(catId);
              fetchData();
              Alert.alert('Success', 'Category deleted successfully.');
            } catch (error: any) {
              setLoading(false);
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the Category.');
      return;
    }

    if (!selectedModelTypeId && !isCreatingNewModel) {
      Alert.alert('Error', 'Please select a Model Type or create a new one.');
      return;
    }

    let finalModelTypeId = selectedModelTypeId;

    setSaving(true);
    try {
      if (isCreatingNewModel) {
        if (!newModelName.trim()) {
          Alert.alert('Error', 'Please enter a name for the new Model Type.');
          setSaving(false);
          return;
        }

        const standard_sizes = newModelStandardSizes.split(',').map(s => s.trim()).filter(s => s);

        if (standard_sizes.length === 0) {
          Alert.alert('Error', 'Please enter at least one standard size.');
          setSaving(false);
          return;
        }

        const newModelType = await createModelType({
          name: newModelName,
        });
        
        finalModelTypeId = newModelType.id;
      } else {
        // Validation if sizes are being set but no model was created (e.g. they picked an existing model)
        const standard_sizes = newModelStandardSizes.split(',').map(s => s.trim()).filter(s => s);
        
        if (standard_sizes.length === 0) {
          Alert.alert('Error', 'Please enter at least one standard size.');
          setSaving(false);
          return;
        }
      }

      const standard_sizes = newModelStandardSizes.split(',').map(s => s.trim()).filter(s => s);

      if (editingCategoryId) {
        await updateCategoryWithImage(
          editingCategoryId,
          name, 
          imageUri || undefined, 
          finalModelTypeId,
          'standard', // always standard sizes
          standard_sizes,
          []
        );
      } else {
        await createCategoryWithImage(
          name, 
          imageUri || undefined, 
          finalModelTypeId,
          'standard', // always standard sizes
          standard_sizes,
          []
        );
      }
      
      // Reset State
      setIsAdding(false);
      setEditingCategoryId(null);
      setName('');
      setSelectedModelTypeId('');
      setImageUri(null);
      setIsCreatingNewModel(false);
      setNewModelName('');
      setNewModelStandardSizes('');
      
      fetchData();
      Alert.alert('Success', 'Category created successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View 
        className="px-6 pb-6 bg-rose-50 rounded-b-[32px] shadow-sm flex-row items-center justify-between z-10 border-b border-rose-100"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity 
            className="w-10 h-10 bg-white rounded-full items-center justify-center mr-4 shadow-sm"
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="arrow-back" size={24} color="#e11d48" />
          </TouchableOpacity>
          <View>
            <Text className="text-[#C25B3E] font-medium text-xs uppercase tracking-wider mb-0.5">Admin Panel</Text>
            <Text className="text-2xl font-extrabold text-rose-700 font-serif">Categories</Text>
          </View>
        </View>
        {!isAdding && (
          <TouchableOpacity onPress={() => {
            setIsAdding(true);
            setEditingCategoryId(null);
            setName('');
            setSelectedModelTypeId('');
            setImageUri(null);
            setIsCreatingNewModel(false);
            setNewModelStandardSizes('');
          }} className="bg-[#C1275A] px-4 py-2 rounded-full shadow-sm">
            <Text className="text-white font-bold text-sm">+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#C1275A" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {isAdding && (
            <View className="bg-white p-5 rounded-3xl mb-6 shadow-sm border border-slate-200">
              <Text className="text-lg font-extrabold text-slate-800 mb-4">{editingCategoryId ? 'Edit Category' : 'Step 1: Model Type'}</Text>
              
              <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">Select or Create Model Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {modelTypes.map((mt) => (
                  <TouchableOpacity
                    key={mt.id}
                    onPress={() => {
                      setSelectedModelTypeId(mt.id);
                      setIsCreatingNewModel(false);
                    }}
                    className={`mr-2 px-4 py-2 rounded-xl border ${!isCreatingNewModel && selectedModelTypeId === mt.id ? 'border-[#C1275A] bg-rose-50' : 'border-slate-200 bg-white'}`}
                  >
                    <Text className={`font-bold ${!isCreatingNewModel && selectedModelTypeId === mt.id ? 'text-[#C1275A]' : 'text-slate-600'}`}>{mt.name}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => {
                    setIsCreatingNewModel(true);
                    setSelectedModelTypeId('');
                  }}
                  className={`mr-2 px-4 py-2 rounded-xl border border-dashed ${isCreatingNewModel ? 'border-[#C1275A] bg-rose-50' : 'border-[#C1275A] bg-white'}`}
                >
                  <Text className="font-bold text-[#C1275A]">+ Create New</Text>
                </TouchableOpacity>
              </ScrollView>

              {isCreatingNewModel && (
                <View className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-200">
                  <Text className="font-bold text-slate-800 mb-2">Define New Model Type</Text>
                  
                  <TextInput 
                    value={newModelName}
                    onChangeText={setNewModelName}
                    placeholder="Model Name (e.g. Anklets)"
                    className="bg-white border border-slate-200 rounded-xl p-3 text-slate-800 font-bold mb-3"
                  />
                </View>
              )}

              <Text className="text-lg font-extrabold text-slate-800 mb-4 mt-2">Step 2: Category Details</Text>
              
              <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">Category Name (e.g. Silver Anklets)</Text>
              <TextInput 
                value={name}
                onChangeText={setName}
                placeholder="Name"
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-bold mb-4"
              />

              <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">Category Image</Text>
              <TouchableOpacity 
                onPress={pickImage}
                className="h-32 bg-slate-50 border border-slate-200 border-dashed rounded-2xl items-center justify-center mb-4 overflow-hidden"
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={32} color="#94a3b8" />
                    <Text className="text-slate-500 font-medium mt-2">Tap to upload image</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text className="text-lg font-extrabold text-slate-800 mb-4 mt-2">Step 3: Category Sizing</Text>

              <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">Available Sizes</Text>
              
              <TextInput 
                value={newModelStandardSizes}
                onChangeText={setNewModelStandardSizes}
                placeholder="Standard Sizes (e.g. S, M, L or 2.2, 2.4)"
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-bold mb-3"
              />

              <View className="flex-row justify-end mt-4">
                <TouchableOpacity onPress={() => setIsAdding(false)} className="px-5 py-3 mr-2">
                  <Text className="text-slate-500 font-bold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} className="bg-[#C1275A] px-6 py-3 rounded-full flex-row items-center">
                  {saving ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold">Save Complete Setup</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {categories.map(cat => {
            const mt = modelTypes.find(m => m.id === cat.model_type_id);
            return (
              <View key={cat.id} className="bg-white p-4 rounded-3xl mb-4 shadow-sm border border-slate-200 flex-row items-center">
                <View className="w-16 h-16 rounded-2xl bg-slate-50 mr-4 border border-slate-100 overflow-hidden">
                  {cat.image_url ? (
                    <Image source={{ uri: cat.image_url }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Ionicons name="folder-outline" size={24} color="#94a3b8" />
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-extrabold text-slate-800">{cat.category_name}</Text>
                  {mt && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="layers-outline" size={14} color="#64748b" />
                      <Text className="text-slate-500 text-xs font-bold ml-1">{mt.name}</Text>
                      {cat.size_type && (
                        <View className="bg-slate-100 px-1.5 py-0.5 rounded-md ml-2">
                          <Text className="text-[9px] font-bold uppercase text-slate-500">{cat.size_type}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {cat.standard_sizes && cat.standard_sizes.length > 0 && (
                    <Text className="text-xs text-slate-400 mt-1">Sizes: {cat.standard_sizes.join(', ')}</Text>
                  )}
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity 
                    onPress={() => handleEditCategory(cat)}
                    className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-2"
                  >
                    <Ionicons name="pencil" size={20} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDeleteCategory(cat.id)}
                    className="w-10 h-10 bg-rose-50 rounded-full items-center justify-center"
                  >
                    <Ionicons name="trash" size={20} color="#F43F5E" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          
          <View className="h-10" />
        </ScrollView>
      )}
    </View>
  );
}
