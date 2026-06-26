import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { updateUserProfile } from '../../src/api/auth';
import Header from '../../src/components/Header';

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  const [selectedLanguage, setSelectedLanguage] = useState<string>(user?.language || 'en');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = {
        language: selectedLanguage
      };
      
      await updateUserProfile(user.id, data);
      await updateUser(data);
      
      Alert.alert('Success', 'Language preferences updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update language');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <Header title="Language & Region" showBack />
      
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        
        <Text className="text-sm font-bold text-slate-500 mb-2 ml-1">APP LANGUAGE</Text>
        <Text className="text-xs text-slate-400 mb-6 ml-1 leading-5">
          Select the language you want to use for the app interface and communications.
        </Text>

        <View className="bg-white rounded-3xl border border-slate-100 mb-10 overflow-hidden shadow-sm">
          {LANGUAGES.map((lang, index) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => setSelectedLanguage(lang.code)}
              className={`flex-row items-center justify-between p-4 ${
                index !== LANGUAGES.length - 1 ? 'border-b border-slate-50' : ''
              }`}
            >
              <View className="flex-row items-center">
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                  selectedLanguage === lang.code ? 'bg-rose-50' : 'bg-slate-50'
                }`}>
                  <Text className="text-lg">{lang.native.charAt(0)}</Text>
                </View>
                <View>
                  <Text className={`text-base font-bold ${
                    selectedLanguage === lang.code ? 'text-[#FF1F4B]' : 'text-slate-800'
                  }`}>
                    {lang.name}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-1">{lang.native}</Text>
                </View>
              </View>
              
              <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                selectedLanguage === lang.code ? 'border-[#FF1F4B]' : 'border-slate-300'
              }`}>
                {selectedLanguage === lang.code && (
                  <View className="w-3 h-3 rounded-full bg-[#FF1F4B]" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          onPress={handleSave}
          disabled={loading}
          className={`w-full py-4 rounded-full items-center justify-center flex-row shadow-sm mb-10 ${
            loading ? 'bg-rose-300' : 'bg-[#FF1F4B]'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Save Language</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
