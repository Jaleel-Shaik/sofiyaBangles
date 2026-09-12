import { api } from "@/src/api";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';

import Header from '@/src/components/Header';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }
    setLoading(true);
    try {
      const data = { full_name: fullName.trim(), email: email.trim() };
      await api.auth.updateUserProfile(user.id, data);
      await updateUser(data);
      Alert.alert('Success', 'Profile updated!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="bg-surface border-b border-divider">
        <Header title="Personal Info" showBack transparent />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
          <Text className="text-xs font-bold text-text-hint mb-2 ml-1 uppercase">Full Name</Text>
          <View className="bg-surface flex-row items-center rounded-2xl px-4 h-14 mb-4 border border-divider">
            <Ionicons name="person-outline" size={20} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-base text-text-primary"
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <Text className="text-xs font-bold text-text-hint mb-2 ml-1 uppercase">Email Address</Text>
          <View className="bg-surface flex-row items-center rounded-2xl px-4 h-14 mb-6 border border-divider">
            <Ionicons name="mail-outline" size={20} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-base text-text-primary"
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`w-full py-3.5 rounded-full items-center justify-center flex-row ${loading ? 'bg-primary/60' : 'bg-primary'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
