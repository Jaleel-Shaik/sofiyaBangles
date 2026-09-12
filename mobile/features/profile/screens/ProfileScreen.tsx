import { api } from "@/src/api";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/src/store/authStore";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useState } from "react";

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  const handleUpload = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
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
        await api.auth.updateUserProfile(user!.id, { avatar_url: base64Uri });
        await updateUser({ avatar_url: base64Uri });
      } catch (error) {
        Alert.alert("Error", "Failed to update profile picture");
      }
    }
  };

  const handleAvatarPress = () => {
    Alert.alert("Profile Picture", "What would you like to do?", [
      { text: "View Picture", onPress: () => { if (user?.avatar_url) setIsImageViewerVisible(true); else Alert.alert("No Picture", "No profile picture yet."); } },
      { text: "Upload New", onPress: handleUpload },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { await logout(); } },
    ]);
  };

  const menuItems = [
    { icon: "person-outline", title: "Personal Info", route: "/profile/personal-info" },
    { icon: "location-outline", title: "My Addresses", route: "/profile/addresses" },
    { icon: "logo-whatsapp", title: "WhatsApp Number", route: "/profile/whatsapp" },
    { icon: "pricetag-outline", title: "Size Preferences", route: "/size-preferences" },
    { icon: "bag-outline", title: "My Orders", subtitle: "View purchased items", route: "/orders" },
  ];

  const supportItems = [
    { icon: "chatbubbles-outline", title: "Contact Support", subtitle: "Chat with us", route: "/profile/contact" },
    { icon: "storefront-outline", title: "About Us", subtitle: "Our story", route: "/profile/about" },
    { icon: "help-buoy-outline", title: "Help & FAQs", subtitle: "Shipping & returns", route: "/profile/faq" },
    { icon: "shield-checkmark-outline", title: "Privacy Policy", route: "/profile/privacy" },
  ];

  return (
    <ScrollView
      className="flex-1 bg-[#FAFAFA]"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View
        className="px-5 pb-5 bg-primary/5"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <Text className="text-xl font-bold text-text-primary">My Profile</Text>
      </View>

      <View className="items-center -mt-10 mb-4">
        <TouchableOpacity
          onPress={handleAvatarPress}
          className="w-20 h-20 rounded-full border-2 border-surface shadow-sm mb-3 bg-white items-center justify-center relative"
        >
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} className="w-full h-full rounded-full" />
          ) : (
            <Ionicons name="person" size={40} color="#cbd5e1" />
          )}
          <View className="absolute bottom-0 right-0 bg-primary w-6 h-6 rounded-full items-center justify-center border-2 border-white">
            <Ionicons name="camera" size={14} color="white" />
          </View>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary mb-1">{user?.full_name || "User"}</Text>
        <Text className="text-text-secondary text-xs mb-3">{user?.email || ""}</Text>
      </View>

      <View className="bg-surface rounded-t-3xl pt-6 px-5 pb-20">
        <Text className="text-xs font-bold text-text-hint mb-3 ml-1 uppercase tracking-wider">Account</Text>
        <View className="bg-surface rounded-2xl border border-divider mb-6 overflow-hidden">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              onPress={() => item.route ? router.push(item.route as any) : null}
              className={`flex-row items-center p-4 ${index !== menuItems.length - 1 ? "border-b border-divider" : ""}`}
            >
              <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center mr-4">
                <Ionicons name={item.icon as any} size={20} color="#e11d48" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text-primary mb-0.5">{item.title}</Text>
                {item.subtitle && <Text className="text-xs font-medium text-text-secondary">{item.subtitle}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-xs font-bold text-text-hint mb-3 ml-1 uppercase tracking-wider">Support</Text>
        <View className="bg-surface rounded-2xl border border-divider mb-6 overflow-hidden">
          {supportItems.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              onPress={() => item.route ? router.push(item.route as any) : null}
              className={`flex-row items-center p-4 ${index !== supportItems.length - 1 ? "border-b border-divider" : ""}`}
            >
              <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center mr-4">
                <Ionicons name={item.icon as any} size={20} color="#e11d48" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text-primary mb-0.5">{item.title}</Text>
                {item.subtitle && <Text className="text-xs font-medium text-text-secondary">{item.subtitle}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex-row justify-center items-center mb-6"
        >
          <Ionicons name="log-out-outline" size={20} color="#e11d48" />
          <Text className="text-primary font-bold text-base ml-2">Logout</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isImageViewerVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/90 justify-center items-center">
          <SafeAreaView className="absolute top-0 right-0 w-full z-10 flex-row justify-end p-4">
            <TouchableOpacity onPress={() => setIsImageViewerVisible(false)} className="bg-black/50 p-2 rounded-full">
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </SafeAreaView>
          {user?.avatar_url && (
            <Image source={{ uri: user.avatar_url }} className="w-full h-96" resizeMode="contain" />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}
