import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getBusinessProfile, updateBusinessProfile, BusinessProfile } from '../../../src/api/settings';

export default function SupportContactsScreen() {
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
      Alert.alert("Error", "Failed to load support contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateBusinessProfile({ 
        whatsapp_number: profile.whatsapp_number,
        email: profile.email,
        phone_number: profile.phone_number
      });
      Alert.alert("Success", "Support contacts updated successfully", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to update support contacts");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#10b981" />
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
        <Text className="text-xl font-extrabold text-slate-800">Support Contacts</Text>
      </View>
      
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-slate-500 mb-6 leading-5">
          These contact details are linked to the buttons on the "Contact Support" page in the customer app.
        </Text>

        <View className="mb-5">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">WhatsApp Number</Text>
          <View className="bg-white rounded-2xl border border-slate-200 px-4 py-1 flex-row items-center shadow-sm">
            <Ionicons name="logo-whatsapp" size={20} color="#10b981" />
            <TextInput
              value={profile.whatsapp_number}
              onChangeText={(text) => setProfile({ ...profile, whatsapp_number: text })}
              placeholder="e.g. +919876543210"
              keyboardType="phone-pad"
              className="flex-1 p-3 text-slate-800 font-medium"
            />
          </View>
          <Text className="text-[10px] text-slate-400 mt-1 ml-2">Include country code (e.g. +91)</Text>
        </View>

        <View className="mb-5">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Support Email</Text>
          <View className="bg-white rounded-2xl border border-slate-200 px-4 py-1 flex-row items-center shadow-sm">
            <Ionicons name="mail" size={20} color="#e11d48" />
            <TextInput
              value={profile.email}
              onChangeText={(text) => setProfile({ ...profile, email: text })}
              placeholder="support@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="flex-1 p-3 text-slate-800 font-medium"
            />
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Direct Phone Number</Text>
          <View className="bg-white rounded-2xl border border-slate-200 px-4 py-1 flex-row items-center shadow-sm">
            <Ionicons name="call" size={20} color="#6366f1" />
            <TextInput
              value={profile.phone_number}
              onChangeText={(text) => setProfile({ ...profile, phone_number: text })}
              placeholder="+919876543210"
              keyboardType="phone-pad"
              className="flex-1 p-3 text-slate-800 font-medium"
            />
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleSave}
          disabled={saving}
          className={`w-full py-4 rounded-full items-center justify-center flex-row shadow-sm mb-10 ${saving ? 'bg-emerald-300' : 'bg-[#10b981]'}`}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-extrabold text-lg">Update Contacts</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
