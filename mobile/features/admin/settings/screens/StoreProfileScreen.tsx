import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getBusinessProfile, updateBusinessProfile, BusinessProfile } from '@/src/api/settings';

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
      Alert.alert("Success", "Store profile updated", [
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
        className="px-5 pb-5 bg-surface border-b border-divider flex-row items-center"
        style={{ paddingTop: Math.max(insets.top + 8, 40) }}
      >
        <TouchableOpacity
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-3"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Store Profile</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
        <Text className="text-text-secondary mb-5 leading-5 text-sm">
          Update your store&apos;s public profile shown to users.
        </Text>

        <View className="mb-5">
          <Text className="text-xs font-bold text-text-hint uppercase tracking-wider mb-2 ml-1">Store Name</Text>
          <View className="bg-surface rounded-2xl border border-divider px-4 py-1 flex-row items-center">
            <Ionicons name="storefront-outline" size={20} color="#94a3b8" />
            <TextInput
              value={profile.store_name}
              onChangeText={(text) => setProfile({ ...profile, store_name: text })}
              placeholder="e.g. Sofiya Bangles"
              className="flex-1 p-3 text-text-primary font-medium"
            />
          </View>
        </View>

        <View className="mb-5">
          <Text className="text-xs font-bold text-text-hint uppercase tracking-wider mb-2 ml-1">Description (Story)</Text>
          <View className="bg-surface rounded-2xl border border-divider px-4 py-3 flex-row">
            <Ionicons name="information-circle-outline" size={20} color="#94a3b8" />
            <TextInput
              value={profile.description}
              onChangeText={(text) => setProfile({ ...profile, description: text })}
              placeholder="Tell your customers about your store..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="flex-1 text-text-primary font-medium min-h-[100px] ml-2"
            />
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-xs font-bold text-text-hint uppercase tracking-wider mb-2 ml-1">Business Hours</Text>
          <View className="bg-surface rounded-2xl border border-divider px-4 py-1 flex-row items-center">
            <Ionicons name="time-outline" size={20} color="#94a3b8" />
            <TextInput
              value={profile.business_hours}
              onChangeText={(text) => setProfile({ ...profile, business_hours: text })}
              placeholder="e.g. Mon-Sat: 10AM - 8PM, Sun: Closed"
              className="flex-1 p-3 text-text-primary font-medium"
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className={`w-full py-3.5 rounded-full items-center justify-center flex-row mb-10 ${saving ? 'bg-primary/60' : 'bg-primary'}`}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
