import { View, Text, Image, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { updateUserProfile } from '../../src/api/auth';
import { useState } from 'react';
export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

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
        await updateUserProfile(user!.id, { avatar_url: base64Uri });
        await updateUser({ avatar_url: base64Uri });
      } catch (error) {
        Alert.alert("Error", "Failed to update profile picture");
      }
    }
  };

  const handleAvatarPress = () => {
    Alert.alert(
      "Profile Picture",
      "What would you like to do?",
      [
        { text: "View Picture", onPress: () => {
          if (user?.avatar_url) setIsImageViewerVisible(true);
          else Alert.alert("No Picture", "You don't have a profile picture yet.");
        }},
        { text: "Upload New", onPress: handleUpload },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const accountItems = [
    { icon: 'person-outline', title: 'Personal Info', route: '/profile/personal-info', iconBg: 'bg-rose-50', iconColor: '#e11d48' },
    { icon: 'location-outline', title: 'My Addresses', route: '/profile/addresses', iconBg: 'bg-rose-50', iconColor: '#e11d48' },
    { icon: 'logo-whatsapp', title: 'WhatsApp Number', route: '/profile/whatsapp', iconBg: 'bg-green-100', iconColor: '#22c55e' },
    { icon: 'pricetag-outline', title: 'Size Preferences', route: '/profile/size-preferences', iconBg: 'bg-rose-50', iconColor: '#e11d48' },
    { icon: 'globe-outline', title: 'Language & Region', route: '/profile/language', iconBg: 'bg-rose-50', iconColor: '#e11d48' },
  ];

  const supportItems = [
    { icon: 'help-circle-outline', title: 'Help & FAQ', iconBg: 'bg-rose-50', iconColor: '#e11d48' },
    { icon: 'star-outline', title: 'Rate the App', iconBg: 'bg-amber-100', iconColor: '#f59e0b' },
    { icon: 'shield-checkmark-outline', title: 'Privacy Policy', iconBg: 'bg-rose-50', iconColor: '#e11d48' },
    { icon: 'log-out-outline', title: 'Logout', iconBg: 'bg-rose-50', iconColor: '#e11d48', isLogout: true },
  ];

  return (
    <ScrollView className="flex-1 bg-[#FFF0F3]" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="px-6 flex-row justify-between items-center" style={{ paddingTop: Math.max(insets.top + 16, 40) }}>
        <Text className="text-2xl font-extrabold text-[#D81B60] font-serif">My Profile</Text>
        <TouchableOpacity className="p-1">
          <Ionicons name="settings-outline" size={24} color="#FF1F4B" />
        </TouchableOpacity>
      </View>

      {/* User Info */}
      <View className="items-center mt-6 mb-6">
        <TouchableOpacity 
          onPress={handleAvatarPress}
          className="w-20 h-20 rounded-full border-2 border-[#D4AF37] shadow-sm mb-3 bg-white items-center justify-center relative"
        >
          {user?.avatar_url ? (
            <Image 
              source={{ uri: user.avatar_url }} 
              className="w-full h-full rounded-full"
            />
          ) : (
            <Ionicons name="person" size={40} color="#cbd5e1" />
          )}
          <View className="absolute bottom-0 right-0 bg-[#FF1F4B] w-6 h-6 rounded-full items-center justify-center border-2 border-white">
            <Ionicons name="add" size={14} color="white" />
          </View>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900 font-serif mb-1">
          {user?.full_name || 'User'}
        </Text>
        <Text className="text-slate-500 text-xs mb-3">
          {user?.email || ''}
        </Text>
        <TouchableOpacity onPress={() => router.push('/profile/personal-info')}>
          <Text className="text-[#FF1F4B] text-xs font-bold">Edit Profile</Text>
        </TouchableOpacity>
      </View>


      {/* Sections Container */}
      <View className="bg-white rounded-t-3xl pt-6 px-5 pb-20 shadow-sm border border-slate-100 flex-1">
        
        {/* MY ACCOUNT */}
        <Text className="text-xs font-bold text-slate-500 mb-4 ml-2">MY ACCOUNT</Text>
        <View className="mb-6">
          {accountItems.map((item, index) => (
            <TouchableOpacity 
              key={item.title} 
              onPress={() => item.route && router.push(item.route as any)}
              className={`flex-row items-center py-4 ${index !== accountItems.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              <View className={`w-9 h-9 rounded-full ${item.iconBg} items-center justify-center mr-4`}>
                <Ionicons name={item.icon as any} size={16} color={item.iconColor} />
              </View>
              <Text className="flex-1 text-[13px] font-bold text-slate-800">{item.title}</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>

        {/* SUPPORT & MORE */}
        <Text className="text-xs font-bold text-slate-500 mb-4 ml-2 mt-2">SUPPORT & MORE</Text>
        <View className="bg-white rounded-2xl shadow-sm border border-slate-50 px-4 mb-10">
          {supportItems.map((item, index) => (
            <TouchableOpacity 
              key={item.title} 
              className={`flex-row items-center py-4 ${index !== supportItems.length - 1 ? 'border-b border-slate-50' : ''}`}
              onPress={item.isLogout ? handleLogout : undefined}
            >
              <View className={`w-9 h-9 rounded-full ${item.iconBg} items-center justify-center mr-4`}>
                <Ionicons name={item.icon as any} size={16} color={item.iconColor} />
              </View>
              <Text className={`flex-1 text-[13px] font-bold ${item.isLogout ? 'text-[#FF1F4B]' : 'text-slate-800'}`}>
                {item.title}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>

      </View>

      {/* Full Screen Image Viewer Modal */}
      <Modal visible={isImageViewerVisible} transparent={true} animationType="fade">
        <View className="flex-1 bg-black/90 justify-center items-center">
          <SafeAreaView className="absolute top-0 right-0 w-full z-10 flex-row justify-end p-4">
            <TouchableOpacity onPress={() => setIsImageViewerVisible(false)} className="bg-black/50 p-2 rounded-full">
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </SafeAreaView>
          {user?.avatar_url && (
            <Image 
              source={{ uri: user.avatar_url }} 
              className="w-full h-96"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}
