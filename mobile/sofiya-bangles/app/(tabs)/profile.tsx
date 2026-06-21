import { View, Text, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();

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
    { icon: 'person-outline', title: 'Personal Info', iconBg: 'bg-rose-50', iconColor: '#e11d48' },
    { icon: 'location-outline', title: 'My Addresses', iconBg: 'bg-rose-50', iconColor: '#e11d48' },
    { icon: 'logo-whatsapp', title: 'WhatsApp Number', iconBg: 'bg-green-100', iconColor: '#22c55e' },
    { icon: 'pricetag-outline', title: 'Size Preferences', iconBg: 'bg-rose-50', iconColor: '#e11d48' },
    { icon: 'globe-outline', title: 'Language & Region', iconBg: 'bg-rose-50', iconColor: '#e11d48' },
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
        <View className="w-20 h-20 rounded-full border-2 border-[#D4AF37] shadow-sm mb-3">
          <Image 
            source={{ uri: 'https://i.pravatar.cc/150?img=47' }} 
            className="w-full h-full rounded-full"
          />
        </View>
        <Text className="text-lg font-bold text-slate-900 font-serif mb-1">
          Priya Sharma
        </Text>
        <Text className="text-slate-500 text-xs mb-3">
          Member since Jan 2024
        </Text>
        <TouchableOpacity>
          <Text className="text-[#FF1F4B] text-xs font-bold">Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View className="px-5 flex-row justify-between mb-6">
        <View className="bg-white rounded-2xl p-4 flex-1 items-center mx-1 shadow-sm border border-slate-100">
          <View className="w-10 h-10 rounded-full bg-rose-50 items-center justify-center mb-2">
            <Ionicons name="heart-outline" size={18} color="#FF1F4B" />
          </View>
          <Text className="text-xl font-bold text-slate-800">8</Text>
          <Text className="text-[10px] text-slate-500 mt-1">Favorites</Text>
        </View>
        <View className="bg-white rounded-2xl p-4 flex-1 items-center mx-1 shadow-sm border border-slate-100">
          <View className="w-10 h-10 rounded-full bg-rose-50 items-center justify-center mb-2">
            <Ionicons name="chatbubble-outline" size={18} color="#FF1F4B" />
          </View>
          <Text className="text-xl font-bold text-slate-800">14</Text>
          <Text className="text-[10px] text-slate-500 mt-1">Inquiries</Text>
        </View>
        <View className="bg-white rounded-2xl p-4 flex-1 items-center mx-1 shadow-sm border border-slate-100">
          <View className="w-10 h-10 rounded-full bg-rose-50 items-center justify-center mb-2">
            <Ionicons name="eye-outline" size={18} color="#FF1F4B" />
          </View>
          <Text className="text-xl font-bold text-slate-800">42</Text>
          <Text className="text-[10px] text-slate-500 mt-1">Viewed</Text>
        </View>
      </View>

      {/* Sections Container */}
      <View className="bg-white rounded-t-3xl pt-6 px-5 pb-20 shadow-sm border border-slate-100 flex-1">
        
        {/* MY ACCOUNT */}
        <Text className="text-xs font-bold text-slate-500 mb-4 ml-2">MY ACCOUNT</Text>
        <View className="mb-6">
          {accountItems.map((item, index) => (
            <TouchableOpacity 
              key={item.title} 
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
    </ScrollView>
  );
}
