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
    { icon: 'pricetag-outline', title: 'Size Preferences', route: '/size-preferences', iconBg: 'bg-rose-50', iconColor: '#e11d48' },
  ];

  const supportItems = [
    { icon: 'chatbubbles-outline', title: 'Contact Support', subtitle: 'Chat with us on WhatsApp', iconBg: 'bg-emerald-50', iconColor: '#10b981', route: '/profile/contact' },
    { icon: 'storefront-outline', title: 'About Us', subtitle: 'Our story and store location', iconBg: 'bg-indigo-50', iconColor: '#6366f1', route: '/profile/about' },
    { icon: 'help-buoy-outline', title: 'Help & FAQs', subtitle: 'Shipping, returns & sizing', iconBg: 'bg-amber-50', iconColor: '#f59e0b', route: '/profile/faq' },
    { icon: 'shield-checkmark-outline', title: 'Privacy Policy', subtitle: 'Terms and data usage', iconBg: 'bg-slate-50', iconColor: '#64748b', route: '/profile/privacy' },
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

      {/* User Info (Header avatar area) */}
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
            <Ionicons name="camera" size={14} color="white" />
          </View>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900 font-serif mb-1">
          {user?.full_name || 'User'}
        </Text>
        <Text className="text-slate-500 text-xs mb-3">
          {user?.email || ''}
        </Text>
      </View>

      {/* Sections Container (Original bottom white sheet) */}
      <View className="bg-white rounded-t-3xl pt-8 px-5 pb-20 shadow-sm border border-slate-100 flex-1">
        
        <Text className="text-xs font-bold text-slate-500 mb-4 ml-1 tracking-wider uppercase">Profile Details</Text>
        
        {/* Personal Info Group */}
        <View className="bg-rose-50 rounded-3xl p-5 mb-4 border border-rose-100 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-[#FF1F4B] items-center justify-center mr-3 shadow-sm">
                <Ionicons name="person" size={18} color="white" />
              </View>
              <Text className="font-extrabold text-slate-800 text-base">Personal Info</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/profile/personal-info' as any)}
              className="bg-white px-3 py-1.5 rounded-full shadow-sm border border-rose-100"
            >
              <Text className="text-[#FF1F4B] text-xs font-extrabold">Edit</Text>
            </TouchableOpacity>
          </View>
          <View className="bg-white p-3 rounded-2xl border border-rose-50">
            <Text className="text-[11px] text-rose-500 font-bold uppercase tracking-wider mb-0.5">Full Name</Text>
            <Text className="text-sm font-extrabold text-slate-800 mb-3">{user?.full_name || 'Not set'}</Text>
            <Text className="text-[11px] text-rose-500 font-bold uppercase tracking-wider mb-0.5">Email Address</Text>
            <Text className="text-sm font-extrabold text-slate-800">{user?.email || 'Not set'}</Text>
          </View>
        </View>

        {/* Contact Group */}
        <View className="bg-emerald-50 rounded-3xl p-5 mb-4 border border-emerald-100 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-emerald-500 items-center justify-center mr-3 shadow-sm">
                <Ionicons name="logo-whatsapp" size={20} color="white" />
              </View>
              <Text className="font-extrabold text-slate-800 text-base">WhatsApp</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/profile/whatsapp' as any)}
              className="bg-white px-3 py-1.5 rounded-full shadow-sm border border-emerald-100"
            >
              <Text className="text-emerald-600 text-xs font-extrabold">Update</Text>
            </TouchableOpacity>
          </View>
          <View className="bg-white p-3 rounded-2xl border border-emerald-50">
            <Text className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Phone Number</Text>
            <Text className="text-sm font-extrabold text-slate-800">
              {user?.phone ? user.phone : 'No number added yet'}
            </Text>
          </View>
        </View>

        {/* Addresses Group */}
        <View className="bg-indigo-50 rounded-3xl p-5 mb-4 border border-indigo-100 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-indigo-500 items-center justify-center mr-3 shadow-sm">
                <Ionicons name="location" size={18} color="white" />
              </View>
              <Text className="font-extrabold text-slate-800 text-base">My Addresses</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/profile/addresses' as any)}
              className="bg-white px-3 py-1.5 rounded-full shadow-sm border border-indigo-100"
            >
              <Text className="text-indigo-600 text-xs font-extrabold">Manage</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-indigo-500 font-medium ml-1 mt-1 leading-5">Manage your shipping and billing locations for future orders.</Text>
        </View>

        {/* Size Preferences Group */}
        <View className="bg-amber-50 rounded-3xl p-5 mb-8 border border-amber-100 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-amber-500 items-center justify-center mr-3 shadow-sm">
                <Ionicons name="pricetag" size={18} color="white" />
              </View>
              <Text className="font-extrabold text-slate-800 text-base">Sizing</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/size-preferences' as any)}
              className="bg-white px-3 py-1.5 rounded-full shadow-sm border border-amber-100"
            >
              <Text className="text-amber-600 text-xs font-extrabold">View Sizes</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-amber-600 font-medium ml-1 mt-1 leading-5">View and update your saved bangle sizes across categories.</Text>
        </View>

        {/* SUPPORT & MORE */}
        <Text className="text-xs font-bold text-slate-500 mb-4 ml-1 tracking-wider uppercase">Support & More</Text>
        <View className="bg-white rounded-3xl border border-slate-100 mb-8 overflow-hidden shadow-sm">
          {supportItems.map((item, index) => (
            <TouchableOpacity 
              key={item.title} 
              onPress={() => item.route ? router.push(item.route as any) : null}
              className={`flex-row items-center p-4 ${index !== supportItems.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              <View className={`w-12 h-12 rounded-2xl ${item.iconBg} items-center justify-center mr-4 border border-white shadow-sm`}>
                <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-extrabold text-slate-800 mb-0.5">
                  {item.title}
                </Text>
                <Text className="text-[11px] font-medium text-slate-500">
                  {item.subtitle}
                </Text>
              </View>
              <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity 
          onPress={handleLogout}
          className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex-row justify-center items-center mb-10 shadow-sm"
        >
          <Ionicons name="log-out-outline" size={20} color="#e11d48" className="mr-2" />
          <Text className="text-[#e11d48] font-extrabold text-base ml-2">Log Out Securely</Text>
        </TouchableOpacity>

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
