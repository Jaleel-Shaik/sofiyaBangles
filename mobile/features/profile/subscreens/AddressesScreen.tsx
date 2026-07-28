import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { updateUserProfile } from '@/src/api/auth';
import Header from '@/src/components/Header';

export default function AddressesScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = {
        address: address.trim()
      };
      
      await updateUserProfile(user.id, data);
      await updateUser(data);
      
      Alert.alert('Success', 'Address updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <Header title="My Addresses" showBack />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
          
          <Text className="text-sm font-bold text-text-secondary mb-2 ml-1">PRIMARY DELIVERY ADDRESS</Text>
          <View className="bg-surface rounded-2xl p-4 mb-8 border border-divider min-h-[120px]">
            <TextInput
              className="flex-1 text-base text-text-primary"
              placeholder="Enter your complete delivery address (Street, City, State, Pincode)"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            className={`w-full py-4 rounded-full items-center justify-center flex-row shadow-sm ${loading ? 'bg-primary/50' : 'bg-primary'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Save Address</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}