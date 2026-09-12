import type { BusinessProfile } from '@/src/api/settings';
import { api } from "@/src/api";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/src/api/client';

export default function StoreProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Partial<BusinessProfile>>({});
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<BusinessProfile>>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.settings.getBusinessProfile();
      setProfile(data);
      setForm(data);
    } catch {
      Alert.alert("Error", "Failed to load store profile");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    setForm({ ...profile });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await api.settings.updateBusinessProfile(form);
      setProfile(updated);
      Alert.alert("Success", "Store profile updated");
      setEditing(false);
    } catch {
      Alert.alert("Error", "Failed to update store profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Permission to access camera roll is required!");
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2,
      base64: true,
    });
    if (!pickerResult.canceled && pickerResult.assets[0].base64) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('logo', {
          uri: pickerResult.assets[0].uri,
          type: 'image/jpeg',
          name: 'logo.jpg',
        } as any);
        const res = await apiClient.post('/settings/business-profile/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const updated = res.data.data;
        setProfile(prev => ({ ...prev, logo_url: updated.logo_url }));
      } catch {
        Alert.alert("Error", "Failed to upload logo");
      } finally {
        setUploading(false);
      }
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
        <Text className="text-text-secondary mb-6 leading-5 text-sm">
          Manage your store&apos;s public information shown to customers.
        </Text>

        {/* Logo */}
        <View className="bg-surface rounded-2xl border border-divider p-5 mb-6">
          <Text className="text-xs font-bold text-text-hint uppercase tracking-wider mb-3">Store Logo</Text>
          <TouchableOpacity onPress={handleLogoUpload} disabled={uploading} className="flex-row items-center gap-4">
            <View className="w-20 h-20 rounded-xl border-2 border-dashed border-divider items-center justify-center overflow-hidden">
              {uploading ? (
                <ActivityIndicator size="small" color="#e11d48" />
              ) : profile.logo_url ? (
                <Image source={{ uri: profile.logo_url }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Ionicons name="image-outline" size={28} color="#94a3b8" />
              )}
            </View>
            <View className="flex-1">
              <Text className="font-bold text-text-primary">{profile.store_name || 'Your Store'}</Text>
              <Text className="text-xs text-text-hint mt-0.5">Tap to change logo</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Store Information */}
        <View className="bg-surface rounded-2xl border border-divider p-5 mb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="storefront-outline" size={18} color="#6366f1" />
            <Text className="font-bold text-text-primary">Store Information</Text>
          </View>

          <View className="mb-4">
            <Text className="text-xs font-bold text-text-hint uppercase tracking-wider mb-1.5">Store Name</Text>
            {editing ? (
              <TextInput value={form.store_name || ''} onChangeText={(t) => setForm(f => ({ ...f, store_name: t }))} className="bg-surface border border-divider rounded-xl px-4 py-2.5 text-text-primary font-medium" />
            ) : (
              <Text className="text-text-primary font-medium">{profile.store_name || '—'}</Text>
            )}
          </View>

          <View>
            <Text className="text-xs font-bold text-text-hint uppercase tracking-wider mb-1.5">Description</Text>
            {editing ? (
              <TextInput value={form.description || ''} onChangeText={(t) => setForm(f => ({ ...f, description: t }))} multiline numberOfLines={4} textAlignVertical="top" className="bg-surface border border-divider rounded-xl px-4 py-2.5 text-text-primary font-medium min-h-[100px]" />
            ) : (
              <Text className="text-text-primary font-medium leading-relaxed">{profile.description || '—'}</Text>
            )}
          </View>
        </View>

        {/* Location */}
        <View className="bg-surface rounded-2xl border border-divider p-5 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="location" size={18} color="#e11d48" />
              <Text className="font-bold text-text-primary">Store Location</Text>
            </View>
          </View>

          <Text className="text-xs font-bold text-text-hint uppercase tracking-wider mb-1.5">Address</Text>
          {editing ? (
            <TextInput
              value={form.address || ''}
              onChangeText={(t) => setForm(f => ({ ...f, address: t }))}
              placeholder="123 Jewelry Market Road, Near Heritage Square, City Center, State 12345"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-surface border border-divider rounded-xl px-4 py-2.5 text-text-primary font-medium min-h-[80px]"
            />
          ) : (
            <Text className="text-text-primary font-medium leading-relaxed">{profile.address || '—'}</Text>
          )}
        </View>

        {/* Contact Information */}
        <View className="bg-surface rounded-2xl border border-divider p-5 mb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="chatbubbles-outline" size={18} color="#10b981" />
            <Text className="font-bold text-text-primary">Contact Information</Text>
          </View>

          {[
            { icon: 'logo-whatsapp' as const, label: 'WhatsApp Number', key: 'whatsapp_number' as const, color: '#10b981' },
            { icon: 'mail-outline' as const, label: 'Email', key: 'email' as const, color: '#3b82f6' },
            { icon: 'call-outline' as const, label: 'Phone Number', key: 'phone_number' as const, color: '#f59e0b' },
          ].map((field, idx) => (
            <View key={field.key} className={idx < 2 ? 'mb-4' : ''}>
              <Text className="text-xs font-bold text-text-hint uppercase tracking-wider mb-1.5 flex-row items-center gap-1">
                <Ionicons name={field.icon} size={14} color={field.color as any} /> {field.label}
              </Text>
              {editing ? (
                <TextInput value={form[field.key] || ''} onChangeText={(t) => setForm(f => ({ ...f, [field.key]: t }))} className="bg-surface border border-divider rounded-xl px-4 py-2.5 text-text-primary font-medium" />
              ) : (
                <Text className="text-text-primary font-medium">{profile[field.key] || '—'}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="mb-10">
          {!editing ? (
            <TouchableOpacity onPress={startEditing} className="bg-primary py-3.5 rounded-full items-center justify-center flex-row">
              <Ionicons name="pencil" size={18} color="white" />
              <Text className="text-white font-bold text-base ml-2">Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={cancelEditing} disabled={saving} className="flex-1 py-3.5 rounded-full border border-divider items-center justify-center disabled:opacity-60">
                <Text className="text-text-primary font-bold text-base">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} className="flex-1 py-3.5 rounded-full bg-primary items-center justify-center flex-row disabled:opacity-60">
                {saving ? <ActivityIndicator size="small" color="white" /> : (
                  <><Ionicons name="checkmark" size={18} color="white" /><Text className="text-white font-bold text-base ml-1">Save</Text></>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
