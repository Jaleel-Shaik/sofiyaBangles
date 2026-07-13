import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getBusinessProfile, updateBusinessProfile, BusinessProfile } from '../../../src/api/settings';

export default function StoreProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<BusinessProfile>>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getBusinessProfile();
      setProfile(data);
    } catch (error) {
      Alert.alert("Error", "Failed to load store profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateBusinessProfile(profile);
      Alert.alert("Success", "Store profile updated successfully", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to update store profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View 
        className="px-6 pb-4 bg-white shadow-sm flex-row items-center border-b border-slate-100"
        style={{ paddingTop: Math.max(insets.top + 8, 40) }}
      >
        <TouchableOpacity 
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-800">Store Profile</Text>
      </View>
      
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-slate-500 mb-6 leading-5">
          Update your store's public profile. This information is displayed to users on the "About Us" page.
        </Text>

        <View className="mb-6">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Store Name</Text>
          <View className="bg-white rounded-2xl border border-slate-200 px-4 py-1 flex-row items-center shadow-sm">
            <Ionicons name="storefront-outline" size={20} color="#94a3b8" />
            <TextInput
              value={profile.store_name}
              onChangeText={(text) => setProfile({ ...profile, store_name: text })}
              placeholder="e.g. Sofiya Bangles"
              className="flex-1 p-3 text-slate-800 font-medium"
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Business Description (Story)</Text>
          <View className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex-row shadow-sm">
            <Ionicons name="information-circle-outline" size={20} color="#94a3b8" className="mt-1 mr-2" />
            <TextInput
              value={profile.description}
              onChangeText={(text) => setProfile({ ...profile, description: text })}
              placeholder="Tell your customers about your store..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="flex-1 text-slate-800 font-medium min-h-[100px]"
            />
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Business Hours</Text>
          <View className="bg-white rounded-2xl border border-slate-200 px-4 py-1 flex-row items-center shadow-sm">
            <Ionicons name="time-outline" size={20} color="#94a3b8" />
            <TextInput
              value={profile.business_hours}
              onChangeText={(text) => setProfile({ ...profile, business_hours: text })}
              placeholder="e.g. Mon-Sat: 10AM - 8PM, Sun: Closed"
              className="flex-1 p-3 text-slate-800 font-medium"
            />
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleSave}
          disabled={saving}
          className={`w-full py-4 rounded-full items-center justify-center flex-row shadow-sm mb-10 ${saving ? 'bg-indigo-300' : 'bg-indigo-600'}`}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-extrabold text-lg">Save Profile Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
