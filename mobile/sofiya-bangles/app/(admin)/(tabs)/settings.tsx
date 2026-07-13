import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { useRouter } from 'expo-router';

export default function AdminSettings() {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "Admin Logout",
      "Are you sure you want to log out of the admin panel?",
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

  const businessItems = [
    { icon: 'storefront-outline', title: 'Store Profile', subtitle: 'Edit name, description & hours', iconBg: 'bg-indigo-50', iconColor: '#6366f1', route: '/(admin)/settings/store-profile' },
    { icon: 'location-outline', title: 'Store Location', subtitle: 'Update physical address for users', iconBg: 'bg-rose-50', iconColor: '#e11d48', route: '/(admin)/settings/store-location' },
    { icon: 'chatbubbles-outline', title: 'Support Contacts', subtitle: 'Manage WhatsApp & Email links', iconBg: 'bg-emerald-50', iconColor: '#10b981', route: '/(admin)/settings/support-contacts' },
  ];

  const adminItems = [
    { icon: 'notifications-outline', title: 'Order Alerts', subtitle: 'Push notifications for new orders', iconBg: 'bg-amber-50', iconColor: '#f59e0b', route: '/(admin)/settings/order-alerts' },
    { icon: 'people-outline', title: 'Team Management', subtitle: 'Add or remove admin access', iconBg: 'bg-blue-50', iconColor: '#3b82f6', route: '/(admin)/settings/team-management' },
    { icon: 'shield-checkmark-outline', title: 'Security Settings', subtitle: 'Password and 2FA', iconBg: 'bg-slate-50', iconColor: '#64748b', route: '/(admin)/settings/security-settings' },
  ];

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Admin Header */}
        <View 
          className="pb-8 bg-slate-900 rounded-b-[40px] shadow-md mb-8 relative overflow-hidden"
          style={{ paddingTop: Math.max(insets.top + 16, 40) }}
        >
          {/* Decorative Background Elements */}
          <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
          <View className="absolute bottom-0 -left-10 w-32 h-32 bg-rose-500/10 rounded-full" />

          <View className="px-6 mb-4 flex-row justify-between items-center">
            <Text className="text-white text-2xl font-extrabold font-serif">Admin Center</Text>
            <TouchableOpacity 
              className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="eye-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
          
          <View className="items-center mt-2">
            <View className="w-20 h-20 bg-rose-500 rounded-full items-center justify-center mb-3 border-4 border-slate-800 shadow-lg relative">
              <Ionicons name="briefcase" size={36} color="white" />
              <View className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-slate-900 rounded-full items-center justify-center">
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            </View>
            <Text className="text-white font-extrabold text-xl mb-1">{user?.full_name || 'Admin User'}</Text>
            <Text className="text-slate-400 text-xs font-medium uppercase tracking-widest">{user?.email}</Text>
          </View>
        </View>

        <View className="px-5">
          {/* Business Management */}
          <Text className="text-xs font-bold text-slate-500 mb-4 ml-1 tracking-wider uppercase">Business Management</Text>
          <View className="bg-white rounded-3xl border border-slate-100 mb-8 overflow-hidden shadow-sm">
            {businessItems.map((item, index) => (
              <SettingCard 
                key={item.title} 
                item={item} 
                isLast={index === businessItems.length - 1} 
                router={router}
              />
            ))}
          </View>

          {/* Admin Preferences */}
          <Text className="text-xs font-bold text-slate-500 mb-4 ml-1 tracking-wider uppercase">Admin Preferences</Text>
          <View className="bg-white rounded-3xl border border-slate-100 mb-8 overflow-hidden shadow-sm">
            {adminItems.map((item, index) => (
              <SettingCard 
                key={item.title} 
                item={item} 
                isLast={index === adminItems.length - 1} 
                router={router}
              />
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity 
            className="flex-row items-center justify-center bg-rose-50 p-4 rounded-2xl border border-rose-100 mb-12 shadow-sm"
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#e11d48" className="mr-2" />
            <Text className="font-extrabold text-[#e11d48] text-base ml-1">Secure Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingCard({ item, isLast, router }: { item: any, isLast: boolean, router: any }) {
  return (
    <TouchableOpacity 
      className={`flex-row items-center p-4 ${!isLast ? 'border-b border-slate-50' : ''}`}
      onPress={() => item.route && router.push(item.route)}
    >
      <View className={`w-12 h-12 rounded-2xl ${item.iconBg} items-center justify-center mr-4 border border-white shadow-sm`}>
        <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
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
  );
}
