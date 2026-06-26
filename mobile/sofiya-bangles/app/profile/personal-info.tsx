import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { updateUserProfile } from '../../src/api/auth';
import Header from '../../src/components/Header';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }

    setLoading(true);
    try {
      const data = {
        full_name: fullName.trim(),
        email: email.trim(),
        avatar_url: avatarUrl.trim()
      };
      
      await updateUserProfile(user.id, data);
      await updateUser(data);
      
      Alert.alert('Success', 'Profile updated successfully!', [
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
      <Header title="Personal Info" showBack />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          
          <Text className="text-sm font-bold text-slate-500 mb-2 ml-1">FULL NAME</Text>
          <View className="bg-white flex-row items-center rounded-2xl px-4 h-14 mb-5 border border-slate-200">
            <Ionicons name="person-outline" size={20} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-base text-slate-800"
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <Text className="text-sm font-bold text-slate-500 mb-2 ml-1">EMAIL ADDRESS</Text>
          <View className="bg-white flex-row items-center rounded-2xl px-4 h-14 mb-5 border border-slate-200">
            <Ionicons name="mail-outline" size={20} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-base text-slate-800"
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text className="text-sm font-bold text-slate-500 mb-2 ml-1">PROFILE PICTURE URL (OPTIONAL)</Text>
          <View className="bg-white flex-row items-center rounded-2xl px-4 h-14 mb-8 border border-slate-200">
            <Ionicons name="image-outline" size={20} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-base text-slate-800"
              placeholder="https://example.com/avatar.jpg"
              autoCapitalize="none"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
            />
          </View>

          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            className={`w-full py-4 rounded-full items-center justify-center flex-row shadow-sm ${loading ? 'bg-rose-300' : 'bg-[#FF1F4B]'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
