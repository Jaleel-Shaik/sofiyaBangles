import type { BusinessProfile } from '@/src/api/settings';
import { api } from "@/src/api";
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';


export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.settings.getBusinessProfile();
      setProfile(data);
    } catch (error) {
      console.error("Failed to load business profile:", error);
    } finally {
      setLoading(false);
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
        className="px-5 pb-6 bg-surface shadow-sm flex-row items-center border-b border-divider"
        style={{ paddingTop: Math.max(insets.top + 8, 40) }}
      >
        <TouchableOpacity 
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text-primary">About Us</Text>
      </View>
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        <View className="w-full h-64 bg-slate-200 relative">
          <Image 
            source={{ uri: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a" }} 
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/40 justify-end p-6">
            <Text className="text-white text-3xl font-serif font-bold mb-1">{profile?.store_name || "Sofiya Bangles"}</Text>
            <Text className="text-white/80 font-medium">Crafting Elegance</Text>
          </View>
        </View>

        <View className="px-5 pt-8 pb-10">
          <Text className="text-xl font-bold text-text-primary mb-4">Our Story</Text>
          <Text className="text-slate-600 leading-6 mb-8">
            {profile?.description || "Founded with a passion for traditional craftsmanship and modern elegance, Sofiya Bangles has been a cornerstone for premium jewelry in the local community. We believe every bangle tells a story, carrying the legacy of artisans who pour their heart into every intricate design."}
          </Text>

          <View className="bg-surface p-5 rounded-2xl border border-divider shadow-sm mb-6">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center mr-3">
                <Ionicons name="location" size={20} color="#6366f1" />
              </View>
              <Text className="text-lg font-bold text-text-primary">Store Location</Text>
            </View>
            <Text className="text-slate-600 font-bold mb-1">{profile?.store_name || "Sofiya Bangles Flagship Store"}</Text>
            <Text className="text-text-secondary leading-5">
              {profile?.address || "123 Jewelry Market Road, Near Heritage Square, City Center, State 12345"}
            </Text>
          </View>

          <View className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex-row items-center">
            <View className="flex-1 pr-4">
              <Text className="text-amber-800 font-bold text-lg mb-1">Our Promise</Text>
              <Text className="text-amber-700/80 text-sm leading-5">100% authentic materials and a fit guarantee on all our standard sizes.</Text>
            </View>
            <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
              <Ionicons name="star" size={20} color="#f59e0b" />
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}