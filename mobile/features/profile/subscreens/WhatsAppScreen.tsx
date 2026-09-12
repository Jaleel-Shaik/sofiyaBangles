import { api } from "@/src/api";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';

import Header from '@/src/components/Header';

export default function WhatsAppScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = {
        phone: phone.trim()
      };
      
      await api.auth.updateUserProfile(user.id, data);
      await updateUser(data);
      
      Alert.alert('Success', 'WhatsApp number updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update WhatsApp number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <Header title="WhatsApp Number" showBack />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
          
          <Text className="text-sm font-bold text-text-secondary mb-2 ml-1">PHONE NUMBER</Text>
          <View className="bg-surface flex-row items-center rounded-2xl px-4 h-14 mb-8 border border-divider">
            <Ionicons name="logo-whatsapp" size={20} color="#22c55e" />
            <Text className="text-text-primary font-bold ml-3 text-base">+91</Text>
            <View className="w-[1px] h-6 bg-divider mx-3" />
            <TextInput
              className="flex-1 text-base text-text-primary"
              placeholder="Enter 10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <Text className="text-xs text-text-secondary mb-8 ml-1 text-center">
            This number will be used for order updates and customer support directly via WhatsApp.
          </Text>

          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            className={`w-full py-4 rounded-full items-center justify-center flex-row shadow-sm ${loading ? 'bg-primary/50' : 'bg-primary'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Save Number</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}