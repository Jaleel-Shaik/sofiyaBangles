import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getBusinessProfile, updateBusinessProfile, BusinessProfile } from '@/src/api/settings';

export default function StoreLocationScreen() {
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
      Alert.alert("Error", "Failed to load store location");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateBusinessProfile({ address: profile.address });
      Alert.alert("Success", "Store location updated successfully", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to update store location");
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
        className="px-5 pb-6 bg-surface shadow-sm flex-row items-center border-b border-divider"
        style={{ paddingTop: Math.max(insets.top + 8, 40) }}
      >
        <TouchableOpacity 
          className="mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text-primary">Store Location</Text>
      </View>
      
      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-text-secondary mb-6 leading-5">
          Update the physical address of your store. This is displayed on the &quot;About Us&quot; page for customers looking to visit.
        </Text>

        <View className="bg-primary/5 p-6 rounded-2xl border border-primary/10 mb-6 items-center">
          <View className="w-16 h-16 bg-surface rounded-full items-center justify-center shadow-sm mb-3">
            <Ionicons name="location" size={32} color="#e11d48" />
          </View>
          <Text className="text-text-primary font-bold mb-1">Physical Storefront</Text>
          <Text className="text-text-secondary text-xs text-center">Make sure this address is easily identifiable on maps.</Text>
        </View>

        <View className="mb-8">
          <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ml-1">Full Address</Text>
          <View className="bg-surface rounded-2xl border border-divider px-4 py-3 shadow-sm">
            <TextInput
              value={profile.address}
              onChangeText={(text) => setProfile({ ...profile, address: text })}
              placeholder="123 Jewelry Market Road, Near Heritage Square, City Center, State 12345"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="text-text-primary font-medium min-h-[100px]"
            />
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleSave}
          disabled={saving}
          className={`w-full py-4 rounded-full items-center justify-center flex-row shadow-sm mb-10 ${saving ? 'bg-primary/60' : 'bg-primary'}`}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Update Location</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
