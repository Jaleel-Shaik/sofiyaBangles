import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { updateUserProfile } from '../../src/api/auth';
import Header from '../../src/components/Header';

const SIZES = ['2.2', '2.4', '2.6', '2.8', '2.10', '2.12'];

export default function SizePreferencesScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  const [selectedSize, setSelectedSize] = useState<string>(user?.size_preference || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = {
        size_preference: selectedSize
      };
      
      await updateUserProfile(user.id, data);
      await updateUser(data);
      
      Alert.alert('Success', 'Size preferences updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update size preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <Header title="Size Preferences" showBack />
      
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        
        <Text className="text-sm font-bold text-slate-500 mb-2 ml-1">MY BANGLE SIZE</Text>
        <Text className="text-xs text-slate-400 mb-6 ml-1 leading-5">
          Select your default bangle size. This helps us recommend the right products for you and speeds up your checkout process.
        </Text>

        <View className="flex-row flex-wrap justify-between mb-10">
          {SIZES.map((size) => (
            <TouchableOpacity
              key={size}
              onPress={() => setSelectedSize(size)}
              className={`w-[30%] h-14 rounded-2xl items-center justify-center mb-4 border ${
                selectedSize === size 
                  ? 'border-[#FF1F4B] bg-[#FF1F4B]' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              <Text 
                className={`text-lg font-bold ${
                  selectedSize === size ? 'text-white' : 'text-slate-800'
                }`}
              >
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          onPress={handleSave}
          disabled={loading || !selectedSize}
          className={`w-full py-4 rounded-full items-center justify-center flex-row shadow-sm ${
            (loading || !selectedSize) ? 'bg-rose-300' : 'bg-[#FF1F4B]'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Save Size</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
