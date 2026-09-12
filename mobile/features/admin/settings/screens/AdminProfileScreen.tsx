import { api } from "@/src/api";
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/authStore';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

export default function AdminProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '' });

  const startEditing = () => {
    setForm({ full_name: user?.full_name || '', phone: user?.phone || '' });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      Alert.alert('Validation', 'Full name is required');
      return;
    }
    setSaving(true);
    try {
      await api.auth.updateUserProfile(user!.id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
      });
      await updateUser({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
      });
      Alert.alert('Success', 'Profile updated');
      setEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
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
      try {
        const base64Uri = `data:image/jpeg;base64,${pickerResult.assets[0].base64}`;
        await api.auth.updateUserProfile(user!.id, { avatar_url: base64Uri });
        await updateUser({ avatar_url: base64Uri });
      } catch (error) {
        Alert.alert("Error", "Failed to update profile picture");
      }
    }
  };

  const handleAvatarPress = () => {
    Alert.alert("Profile Picture", "What would you like to do?", [
      {
        text: "View Picture",
        onPress: () => {
          if (user?.avatar_url) setIsImageViewerVisible(true);
          else Alert.alert("No Picture", "No profile picture yet.");
        },
      },
      { text: "Upload New", onPress: handleUpload },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const infoRows = [
    { icon: 'person-outline', label: 'Full Name', key: 'full_name', value: user?.full_name, editable: true },
    { icon: 'mail-outline', label: 'Email', key: 'email', value: user?.email, editable: false },
    { icon: 'call-outline', label: 'Phone', key: 'phone', value: user?.phone, editable: true },
    { icon: 'shield-checkmark-outline', label: 'Role', key: 'role', value: user?.role, editable: false },
  ];

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View
          className="px-5 pb-5 bg-primary/5"
          style={{ paddingTop: Math.max(insets.top + 16, 40) }}
        >
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#171717" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-text-primary">My Profile</Text>
          </View>
        </View>

        <View className="items-center -mt-10 mb-4">
          <TouchableOpacity
            onPress={handleAvatarPress}
            className="w-24 h-24 rounded-full border-2 border-surface shadow-sm mb-3 bg-white items-center justify-center relative"
          >
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} className="w-full h-full rounded-full" />
            ) : (
              <Ionicons name="person" size={48} color="#cbd5e1" />
            )}
            <View className="absolute bottom-0 right-0 bg-primary w-7 h-7 rounded-full items-center justify-center border-2 border-white">
              <Ionicons name="camera" size={16} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text-primary mb-1">{user?.full_name || 'Admin User'}</Text>
          <Text className="text-text-secondary text-xs">{user?.email || ''}</Text>
        </View>

        <View className="bg-surface rounded-t-3xl pt-6 px-5 pb-20">
          <Text className="text-xs font-bold text-text-hint mb-3 ml-1 uppercase tracking-wider">Personal Information</Text>
          <View className="bg-surface rounded-2xl border border-divider mb-6 overflow-hidden">
            {infoRows.map((row, index) => (
              <View
                key={row.label}
                className={`flex-row items-center p-4 ${index !== infoRows.length - 1 ? 'border-b border-divider' : ''}`}
              >
                <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center mr-4">
                  <Ionicons name={row.icon as any} size={20} color="#e11d48" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-text-secondary mb-0.5">{row.label}</Text>
                  {editing && row.editable ? (
                    <TextInput
                      value={row.key === 'full_name' ? form.full_name : form.phone}
                      onChangeText={(text) => setForm(f => ({ ...f, [row.key]: text }))}
                      className="text-sm font-bold text-text-primary bg-[#F5F5F5] border border-divider rounded-lg px-2 py-1 -ml-0.5"
                      placeholderTextColor="#94a3b8"
                      placeholder={row.label}
                    />
                  ) : (
                    <Text className="text-sm font-bold text-text-primary capitalize">
                      {row.value || '—'}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {!editing ? (
            <TouchableOpacity onPress={startEditing} className="bg-primary py-3.5 rounded-full items-center justify-center flex-row mb-6">
              <Ionicons name="pencil" size={18} color="white" />
              <Text className="text-white font-bold text-base ml-2">Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity onPress={cancelEditing} disabled={saving} className="flex-1 py-3.5 rounded-full border border-divider items-center justify-center disabled:opacity-60">
                <Text className="text-text-primary font-bold text-base">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} className="flex-1 py-3.5 rounded-full bg-primary items-center justify-center flex-row disabled:opacity-60">
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="white" />
                    <Text className="text-white font-bold text-base ml-1">Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={isImageViewerVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/90 justify-center items-center">
          <SafeAreaView className="absolute top-0 right-0 w-full z-10 flex-row justify-end p-4">
            <TouchableOpacity onPress={() => setIsImageViewerVisible(false)} className="bg-black/50 p-2 rounded-full">
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </SafeAreaView>
          {user?.avatar_url && (
            <Image source={{ uri: user.avatar_url }} className="w-full h-96" resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}
