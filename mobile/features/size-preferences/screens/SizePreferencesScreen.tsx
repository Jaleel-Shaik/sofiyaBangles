import type { Category } from '@/src/api/categories';
import { api } from "@/src/api";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, TextInput, Image, RefreshControl } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSizeStore } from '@/src/store/sizeStore';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function SizePreferencesScreen() {
  const router = useRouter();
  const { preferences, fetchPreferences, setCategoryPreference, addPreference, removePreference } = useSizeStore();
  const insets = useSafeAreaInsets();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [modalTab, setModalTab] = useState<'standard' | 'custom'>('standard');
  const [standardSize, setStandardSize] = useState('');
  
  // Custom Profile Form State
  const [profileName, setProfileName] = useState('');
  const [customMeasurements, setCustomMeasurements] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setInitialLoading(true);
    await fetchPreferences();
    try {
      const cats = (await api.categories.getCategories()) as Category[];
      if (Array.isArray(cats)) {
        setCategories(cats);
      }
    } catch (e) {
      console.error(e);
    }
    setInitialLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const configuredCategories = useMemo(() => {
    return categories.filter(cat => preferences.some(p => p.category_id === cat.id));
  }, [categories, preferences]);

  const unconfiguredCategories = useMemo(() => {
    return categories.filter(cat => !preferences.some(p => p.category_id === cat.id));
  }, [categories, preferences]);

  const openSizeSelector = (cat: Category, defaultTab: 'standard' | 'custom' = 'standard') => {
    setSelectedCategory(cat);
    setModalTab(defaultTab);
    const existingStandard = preferences.find(p => p.category_id === cat.id && !p.is_custom);
    
    if (existingStandard) {
      setStandardSize(existingStandard.standard_size || '');
    } else {
      setStandardSize(cat.standard_sizes?.[0] || '');
    }
    
    setProfileName(`My ${cat.category_name} Fit`);
    const initialMeas: Record<string, string> = {};
    if (cat.custom_measurement_fields && cat.custom_measurement_fields.length > 0) {
      cat.custom_measurement_fields.forEach(field => {
        initialMeas[field] = '';
      });
    } else {
      initialMeas['wrist_size'] = '';
    }
    setCustomMeasurements(initialMeas);
    
    setModalVisible(true);
  };

  const handleSaveStandard = async () => {
    if (!selectedCategory) return;
    
    if (!standardSize) {
      Alert.alert('Error', 'Please select or enter a size.');
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        profile_name: `My ${selectedCategory.category_name} Size`,
        is_custom: false,
        standard_size: standardSize,
        custom_measurements: null,
      };

      await setCategoryPreference(selectedCategory.id, data);
      setModalVisible(false);
      Alert.alert('Success', `Saved ${standardSize} as your ${selectedCategory.category_name} size preference!`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save size preference');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustom = async () => {
    if (!selectedCategory) return;
    
    if (!profileName.trim()) {
      Alert.alert('Error', 'Please give a name for this custom profile (e.g. My Fit, Mom).');
      return;
    }

    const filledMeasurements = Object.entries(customMeasurements).filter(([_, val]) => val.trim().length > 0);
    if (filledMeasurements.length === 0) {
      Alert.alert('Error', 'Please enter at least one measurement value.');
      return;
    }

    setSaving(true);
    try {
      await addPreference({
        category_id: selectedCategory.id,
        profile_name: profileName.trim(),
        is_custom: true,
        custom_measurements: customMeasurements,
      });
      setModalVisible(false);
      Alert.alert('Success', `Saved custom profile "${profileName.trim()}"!`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save custom profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePref = async (id: string, name: string) => {
    Alert.alert(
      'Delete Preference',
      `Are you sure you want to remove "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removePreference(id);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const renderCategoryCard = (cat: Category, isConfigured: boolean) => {
    const standardPref = preferences.find(p => p.category_id === cat.id && !p.is_custom);
    const customPrefs = preferences.filter(p => p.category_id === cat.id && p.is_custom);
    
    return (
      <View 
        key={cat.id} 
        className="bg-white p-4 rounded-3xl mb-4 shadow-sm border border-slate-100"
      >
        <View className="flex-row items-center">
          <View className="w-14 h-14 rounded-2xl bg-slate-50 mr-3.5 border border-slate-100 overflow-hidden">
            {cat.image_url ? (
              <Image source={{ uri: cat.image_url }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="folder-outline" size={24} color="#94a3b8" />
              </View>
            )}
          </View>
          
          <View className="flex-1">
            <Text className="text-base font-extrabold text-slate-800">{cat.category_name}</Text>
            
            {/* Preferences Badges */}
            {isConfigured ? (
              <View className="mt-1.5 flex-row flex-wrap gap-1.5 items-center">
                {standardPref && (
                  <View className="bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 flex-row items-center">
                    <Ionicons name="star" size={10} color="#FF1F4B" />
                    <Text className="text-[#FF1F4B] font-extrabold text-xs ml-1">
                      Size: {standardPref.standard_size}
                    </Text>
                  </View>
                )}
                {customPrefs.map(cp => (
                  <View key={cp.id} className="bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 flex-row items-center">
                    <Ionicons name="cut" size={10} color="#9333ea" />
                    <Text className="text-purple-700 font-bold text-xs ml-1">
                      {cp.profile_name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-slate-400 text-xs mt-1 font-medium">Tap to set up your standard or custom size</Text>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={() => openSizeSelector(cat)}
            className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center ml-2 border border-slate-100"
          >
            <Ionicons name={isConfigured ? "pencil" : "add"} size={18} color={isConfigured ? "#64748b" : "#FF1F4B"} />
          </TouchableOpacity>
        </View>

        {/* List of Custom Profiles if any */}
        {customPrefs.length > 0 && (
          <View className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom Measurement Profiles:</Text>
            {customPrefs.map(cp => (
              <View key={cp.id} className="flex-row items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-bold text-slate-800">{cp.profile_name}</Text>
                  {cp.custom_measurements && (
                    <Text className="text-[10px] text-slate-500 mt-0.5">
                      {Object.entries(cp.custom_measurements as Record<string, string>)
                        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                        .join(' • ')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity 
                  onPress={() => handleDeletePref(cp.id, cp.profile_name || 'Profile')}
                  className="p-1.5"
                >
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {/* Header */}
      <View 
        className="px-6 pb-5 bg-white shadow-sm flex-row items-center border-b border-slate-100"
        style={{ paddingTop: Math.max(insets.top + 8, 40) }}
      >
        <TouchableOpacity 
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-800">My Size Preferences</Text>
      </View>
      
      {initialLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF1F4B" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6 pt-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} colors={["#FF1F4B"]} />
          }>
          
          <LinearGradient
            colors={['#FF1F4B', '#FF7E67']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-3xl p-5 mb-5 shadow-sm flex-row justify-between items-center"
          >
            <View className="flex-1 pr-4">
              <Text className="text-white font-extrabold text-lg mb-1">Perfect Fit Guarantee</Text>
              <Text className="text-white/80 text-xs leading-5">Save your standard and custom sizes once to enjoy instant filtering & made-to-order purchases.</Text>
            </View>
            <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
              <Ionicons name="sparkles" size={22} color="white" />
            </View>
          </LinearGradient>

          {configuredCategories.length > 0 && (
            <View className="mb-5">
              <View className="flex-row items-center mb-3">
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text className="text-base font-extrabold text-slate-800 ml-1.5">Configured Categories</Text>
              </View>
              {configuredCategories.map(cat => renderCategoryCard(cat, true))}
            </View>
          )}

          {unconfiguredCategories.length > 0 && (
            <View className="mb-5">
              <View className="flex-row items-center mb-3">
                <Ionicons name="alert-circle" size={18} color="#f59e0b" />
                <Text className="text-base font-extrabold text-slate-800 ml-1.5">Needs Setup</Text>
              </View>
              {unconfiguredCategories.map(cat => renderCategoryCard(cat, false))}
            </View>
          )}

          {categories.length === 0 && (
            <View className="items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <Text className="text-slate-800 font-bold text-base">No Categories Found</Text>
              <Text className="text-slate-400 mt-1.5 text-center text-xs px-8">There are no categories available at this time.</Text>
            </View>
          )}
          
          <View className="h-10" />
        </ScrollView>
      )}

      {/* Modal / Bottom Sheet */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white w-full rounded-t-[32px] shadow-2xl" style={{ maxHeight: '90%' }}>
            {/* Handle */}
            <View className="items-center pt-3 pb-2">
              <View className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </View>

            <View className="flex-row justify-between items-center px-6 mb-4">
              <View>
                <Text className="text-lg font-extrabold text-slate-800">
                  {selectedCategory?.category_name} Sizing
                </Text>
                <Text className="text-xs text-slate-400">Configure how you want this product fitted</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center">
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Tab Selector */}
            <View className="flex-row bg-slate-100 mx-6 p-1 rounded-2xl mb-4">
              <TouchableOpacity
                onPress={() => setModalTab('standard')}
                className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
                  modalTab === 'standard' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Ionicons name="apps-outline" size={14} color={modalTab === 'standard' ? '#FF1F4B' : '#64748B'} />
                <Text className={`text-xs font-bold ml-1.5 ${modalTab === 'standard' ? 'text-[#FF1F4B]' : 'text-slate-500'}`}>
                  Standard Size
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalTab('custom')}
                className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
                  modalTab === 'custom' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Ionicons name="cut-outline" size={14} color={modalTab === 'custom' ? '#9333ea' : '#64748B'} />
                <Text className={`text-xs font-bold ml-1.5 ${modalTab === 'custom' ? 'text-purple-700' : 'text-slate-500'}`}>
                  Custom Measurements
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
              
              {/* Standard Size Tab */}
              {modalTab === 'standard' && (
                <View className="mb-6">
                  {selectedCategory?.standard_sizes && selectedCategory.standard_sizes.length > 0 ? (
                    <View>
                      <Text className="text-xs font-extrabold text-slate-400 mb-3 uppercase tracking-wider">Select Standard Size</Text>
                      <View className="flex-row flex-wrap justify-between">
                        {selectedCategory.standard_sizes.map(sz => (
                          <TouchableOpacity
                            key={sz}
                            onPress={() => setStandardSize(sz)}
                            className={`w-[48%] py-3.5 rounded-2xl items-center justify-center mb-3 border-2 ${
                              standardSize === sz 
                                ? 'border-[#FF1F4B] bg-rose-50' 
                                : 'border-slate-100 bg-[#FAFAFA]'
                            }`}
                          >
                            <Text className={`text-base font-extrabold ${standardSize === sz ? 'text-[#FF1F4B]' : 'text-slate-700'}`}>
                              {sz}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View className="bg-rose-50 p-4 rounded-2xl border border-rose-100 mb-4">
                      <Text className="text-xs text-slate-600 leading-5">No standard sizes defined for this category. You can type your size below or switch to the Custom Measurements tab.</Text>
                      <TextInput
                        placeholder="e.g. 2.6, M, L"
                        value={standardSize}
                        onChangeText={setStandardSize}
                        className="bg-white border border-rose-200 rounded-xl px-4 py-2.5 mt-3 text-sm font-bold text-slate-800"
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Custom Measurements Tab */}
              {modalTab === 'custom' && (
                <View className="mb-6 space-y-4">
                  <View>
                    <Text className="text-xs font-bold text-slate-700 mb-1.5">Profile Name *</Text>
                    <TextInput
                      placeholder="e.g. My Fit, Sister's Wedding Fit, Mom"
                      value={profileName}
                      onChangeText={setProfileName}
                      className="bg-[#FAFAFA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800"
                    />
                  </View>

                  <Text className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Enter Measurements ({selectedCategory?.category_name})
                  </Text>

                  {Object.keys(customMeasurements).map(fieldKey => (
                    <View key={fieldKey} className="mb-2">
                      <Text className="text-xs font-bold text-slate-700 mb-1 capitalize">
                        {fieldKey.replace(/_/g, ' ')} *
                      </Text>
                      <TextInput
                        placeholder="e.g. 6.2 cm or 2.5 inches"
                        value={customMeasurements[fieldKey]}
                        onChangeText={(val) => setCustomMeasurements(prev => ({ ...prev, [fieldKey]: val }))}
                        className="bg-[#FAFAFA] border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800"
                      />
                    </View>
                  ))}
                </View>
              )}

              <View className="h-6" />
            </ScrollView>

            <View className="p-6 pb-8 bg-white border-t border-slate-100">
              <TouchableOpacity 
                onPress={modalTab === 'standard' ? handleSaveStandard : handleSaveCustom}
                disabled={saving}
                className="w-full py-4 rounded-full items-center justify-center flex-row shadow-sm bg-[#FF1F4B]"
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-extrabold text-base">
                    {modalTab === 'standard' ? 'Save Standard Size' : 'Save Custom Profile'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}
