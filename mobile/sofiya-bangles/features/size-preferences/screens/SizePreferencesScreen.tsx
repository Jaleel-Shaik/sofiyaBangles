import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, TextInput, Image, Dimensions } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/authStore';
import { useSizeStore } from '@/src/store/sizeStore';
import { getCategories, Category } from '@/src/api/categories';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function SizePreferencesScreen() {
  const router = useRouter();
  const { preferences, loading, fetchPreferences, setCategoryPreference } = useSizeStore();
  const insets = useSafeAreaInsets();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [standardSize, setStandardSize] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setInitialLoading(true);
    await fetchPreferences();
    try {
      const cats = (await getCategories()) as Category[];
      if (Array.isArray(cats)) {
        setCategories(cats); // removed filter so all categories are visible
      }
    } catch (e) {
      console.error(e);
    }
    setInitialLoading(false);
  };

  const configuredCategories = useMemo(() => {
    return categories.filter(cat => preferences.some(p => p.category_id === cat.id));
  }, [categories, preferences]);

  const unconfiguredCategories = useMemo(() => {
    return categories.filter(cat => !preferences.some(p => p.category_id === cat.id));
  }, [categories, preferences]);

  const openSizeSelector = (cat: Category) => {
    setSelectedCategory(cat);
    const existingPref = preferences.find(p => p.category_id === cat.id);
    
    if (existingPref) {
      setStandardSize(existingPref.standard_size || '');
    } else {
      setStandardSize('');
    }
    
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedCategory) return;
    
    if (!standardSize) {
      Alert.alert('Error', 'Please select or enter a size.');
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        profile_name: `My ${selectedCategory.category_name} Size`, // Automated
        is_custom: false,
        standard_size: standardSize,
        custom_measurements: null,
      };

      await setCategoryPreference(selectedCategory.id, data);
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save size preference');
    } finally {
      setSaving(false);
    }
  };

  const renderCategoryCard = (cat: Category, isConfigured: boolean) => {
    const pref = preferences.find(p => p.category_id === cat.id);
    
    return (
      <TouchableOpacity 
        key={cat.id} 
        onPress={() => openSizeSelector(cat)}
        className="bg-white p-4 rounded-3xl mb-4 shadow-sm border border-slate-100 flex-row items-center"
      >
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
          {isConfigured && pref ? (
            <View className="mt-2 flex-row items-center">
              <View className="bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                <Text className="text-[#FF1F4B] font-extrabold text-sm">
                  {pref.standard_size}
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-slate-400 text-xs mt-1 font-medium">Tap to set up your size</Text>
          )}
        </View>
        
        <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center">
          <Ionicons name={isConfigured ? "pencil" : "add"} size={20} color={isConfigured ? "#64748b" : "#FF1F4B"} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {/* Header */}
      <View 
        className="px-6 pb-6 bg-white shadow-sm flex-row items-center border-b border-slate-100"
        style={{ paddingTop: Math.max(insets.top + 8, 40) }}
      >
        <TouchableOpacity 
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-800">My Sizes</Text>
      </View>
      
      {initialLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF1F4B" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          
          <LinearGradient
            colors={['#FF1F4B', '#FF7E67']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-3xl p-6 mb-6 shadow-sm flex-row justify-between items-center"
          >
            <View className="flex-1 pr-4">
              <Text className="text-white font-extrabold text-xl mb-1">Perfect Fit Guarantee</Text>
              <Text className="text-white/80 text-xs leading-5">Save your sizes once and get personalized recommendations across the app.</Text>
            </View>
            <View className="w-14 h-14 bg-white/20 rounded-full items-center justify-center">
              <Ionicons name="sparkles" size={24} color="white" />
            </View>
          </LinearGradient>

          {configuredCategories.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text className="text-lg font-extrabold text-slate-800 ml-2">Configured Sizes</Text>
              </View>
              {configuredCategories.map(cat => renderCategoryCard(cat, true))}
            </View>
          )}

          {unconfiguredCategories.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <Ionicons name="alert-circle" size={20} color="#f59e0b" />
                <Text className="text-lg font-extrabold text-slate-800 ml-2">Needs Setup</Text>
              </View>
              {unconfiguredCategories.map(cat => renderCategoryCard(cat, false))}
            </View>
          )}

          {categories.length === 0 && (
            <View className="items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <Text className="text-slate-800 font-bold text-lg">No Categories Found</Text>
              <Text className="text-slate-400 mt-2 text-center text-sm px-8">There are no categories that require size configuration yet.</Text>
            </View>
          )}
          
          <View className="h-10" />
        </ScrollView>
      )}

      {/* Modal / Bottom Sheet */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-[#FAFAFA] w-full rounded-t-3xl shadow-lg" style={{ maxHeight: '85%' }}>              {/* Handle */}
            <View className="items-center pt-4 pb-2">
              <View className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </View>

            <View className="flex-row justify-between items-center px-6 mb-4">
              <Text className="text-xl font-extrabold text-slate-800">
                {selectedCategory?.category_name} Size
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center border border-slate-200">
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
              
              {selectedCategory?.standard_sizes && selectedCategory.standard_sizes.length > 0 && (
                <View className="mb-6">
                  <Text className="text-xs font-extrabold text-slate-400 mb-4 uppercase tracking-wider">Select a Size</Text>
                  <View className="flex-row flex-wrap justify-between">
                    {selectedCategory.standard_sizes.map(sz => (
                        <TouchableOpacity
                        key={sz}
                        onPress={() => setStandardSize(sz)}
                        className={`w-[48%] py-4 rounded-2xl items-center justify-center mb-3 border-2 ${
                          standardSize === sz 
                            ? 'border-[#FF1F4B] bg-rose-50' 
                            : 'border-slate-100 bg-white'
                        }`}
                      >
                        <Text className={`text-lg font-extrabold ${standardSize === sz ? 'text-[#FF1F4B]' : 'text-slate-600'}`}>
                          {sz}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {(!selectedCategory?.standard_sizes || selectedCategory.standard_sizes.length === 0) && (
                <View className="mb-6 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="information-circle" size={20} color="#FF1F4B" />
                    <Text className="text-sm font-extrabold text-slate-800 ml-2">No Sizes Configured</Text>
                  </View>
                  <Text className="text-xs text-slate-600 leading-5">The admin hasn't set up the available standard sizes for this category yet. You cannot set a preference at this time.</Text>
                </View>
              )}

              <View className="h-20" />
            </ScrollView>

            <View className="p-6 pb-10 bg-white border-t border-slate-100">
              <TouchableOpacity 
                onPress={handleSave}
                disabled={saving || (!selectedCategory?.standard_sizes || selectedCategory.standard_sizes.length === 0)}
                className={`w-full py-4 rounded-full items-center justify-center flex-row shadow-sm ${saving || (!selectedCategory?.standard_sizes || selectedCategory.standard_sizes.length === 0) ? 'bg-rose-300' : 'bg-[#FF1F4B]'}`}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-extrabold text-lg">Save Preference</Text>}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}
