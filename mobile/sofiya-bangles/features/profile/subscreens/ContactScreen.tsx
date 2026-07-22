import { View, Text, TouchableOpacity, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { getBusinessProfile, BusinessProfile } from '@/src/api/settings';

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getBusinessProfile();
      setProfile(data);
    } catch (error) {
      console.error("Failed to load business profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = profile?.whatsapp_number?.replace(/[^0-9]/g, '') || '919876543210';
    Linking.openURL(`whatsapp://send?phone=${phone}&text=Hello ${profile?.store_name || 'Sofiya Bangles'}!`);
  };

  const handleEmail = () => {
    const email = profile?.email || 'support@sofiyabangles.com';
    Linking.openURL(`mailto:${email}`);
  };

  const handleCall = () => {
    const phone = profile?.phone_number || '+919876543210';
    Linking.openURL(`tel:${phone}`);
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
        className="px-6 pb-6 bg-white shadow-sm flex-row items-center border-b border-slate-100"
        style={{ paddingTop: Math.max(insets.top + 8, 40) }}
      >
        <TouchableOpacity 
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-800">Contact Support</Text>
      </View>
      
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-10 mt-4">
          <View className="w-24 h-24 bg-emerald-50 rounded-full items-center justify-center mb-4">
            <Ionicons name="chatbubbles" size={40} color="#10b981" />
          </View>
          <Text className="text-2xl font-extrabold text-slate-800 text-center mb-2">We're here to help!</Text>
          <Text className="text-slate-500 text-center px-4 leading-6">
            Have questions about an order, sizing, or our collection? Reach out to us directly.
          </Text>
        </View>

        <TouchableOpacity 
          onPress={handleWhatsApp}
          className="bg-emerald-500 p-5 rounded-3xl flex-row items-center mb-4 shadow-sm"
        >
          <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center mr-4">
            <Ionicons name="logo-whatsapp" size={24} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-extrabold text-lg mb-0.5">Chat on WhatsApp</Text>
            <Text className="text-emerald-100 font-medium text-xs">Fastest response time</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>

        <View className="flex-row justify-between mb-8">
          <TouchableOpacity 
            onPress={handleCall}
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm w-[48%] items-center"
          >
            <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center mb-3">
              <Ionicons name="call" size={24} color="#6366f1" />
            </View>
            <Text className="text-slate-800 font-bold text-sm">Call Us</Text>
            <Text className="text-slate-400 text-[10px] mt-1">{profile?.phone_number || "+91 98765 43210"}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleEmail}
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm w-[48%] items-center"
          >
            <View className="w-12 h-12 bg-rose-50 rounded-2xl items-center justify-center mb-3">
              <Ionicons name="mail" size={24} color="#e11d48" />
            </View>
            <Text className="text-slate-800 font-bold text-sm">Email Us</Text>
            <Text className="text-slate-400 text-[10px] mt-1">{profile?.email || "support@sofiya.com"}</Text>
          </TouchableOpacity>
        </View>
        
        <View className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
          <Text className="font-bold text-slate-800 mb-2">Business Hours</Text>
          <Text className="text-slate-600 leading-5">
            {profile?.business_hours || "Mon-Sat: 10AM - 8PM, Sun: Closed"}
          </Text>
        </View>

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
