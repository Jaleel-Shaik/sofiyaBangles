import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/authStore';
import { useRouter } from 'expo-router';

export default function AdminSettings() {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "Admin Logout",
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

  const businessItems = [
    { icon: 'storefront-outline', title: 'Store Profile', subtitle: 'Edit business details', iconBg: 'bg-indigo-50', iconColor: '#6366f1', route: '/(admin)/settings/store-profile' as const },
    { icon: 'location-outline', title: 'Store Location', subtitle: 'Update physical address', iconBg: 'bg-rose-50', iconColor: '#e11d48', route: '/(admin)/settings/store-location' as const },
    { icon: 'chatbubbles-outline', title: 'Support Contacts', subtitle: 'Manage WhatsApp & Email', iconBg: 'bg-emerald-50', iconColor: '#10b981', route: '/(admin)/settings/support-contacts' as const },
  ];

  const adminItems = [
    { icon: 'notifications-outline', title: 'Order Alerts', subtitle: 'Push notifications for new orders', iconBg: 'bg-amber-50', iconColor: '#f59e0b', route: '/(admin)/settings/order-alerts' as const },
    { icon: 'people-outline', title: 'Team Management', subtitle: 'Add or remove admin access', iconBg: 'bg-blue-50', iconColor: '#3b82f6', route: '/(admin)/settings/team-management' as const },
    { icon: 'shield-checkmark-outline', title: 'Security Settings', subtitle: 'Password and 2FA', iconBg: 'bg-slate-50', iconColor: '#64748b', route: '/(admin)/settings/security-settings' as const },
  ];

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View
          className="pb-6 bg-primary px-5"
          style={{ paddingTop: Math.max(insets.top + 16, 40) }}
        >
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-bold">Admin Center</Text>
            <TouchableOpacity
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="eye-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View className="items-center">
            <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-3">
              <Ionicons name="briefcase" size={32} color="white" />
            </View>
            <Text className="text-white font-bold text-lg mb-1">{user?.full_name || 'Admin User'}</Text>
            <Text className="text-white/60 text-xs font-medium">{user?.email}</Text>
          </View>
        </View>

        <View className="px-5">
          <Text className="text-xs font-bold text-text-hint mb-3 ml-1 uppercase tracking-wider">Business</Text>
          <View className="bg-surface rounded-2xl border border-divider mb-6 overflow-hidden">
            {businessItems.map((item, index) => (
              <SettingCard
                key={item.title}
                item={item}
                isLast={index === businessItems.length - 1}
                router={router}
              />
            ))}
          </View>

          <Text className="text-xs font-bold text-text-hint mb-3 ml-1 uppercase tracking-wider">Admin</Text>
          <View className="bg-surface rounded-2xl border border-divider mb-6 overflow-hidden">
            {adminItems.map((item, index) => (
              <SettingCard
                key={item.title}
                item={item}
                isLast={index === adminItems.length - 1}
                router={router}
              />
            ))}
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-center bg-primary/10 p-4 rounded-2xl border border-primary/20 mb-12"
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#e11d48" />
            <Text className="font-bold text-primary text-base ml-2">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingCard({ item, isLast, router }: { item: { icon: string; title: string; subtitle: string; iconBg: string; iconColor: string; route: any }, isLast: boolean, router: any }) {
  return (
    <TouchableOpacity
      className={`flex-row items-center p-4 ${!isLast ? 'border-b border-divider' : ''}`}
      onPress={() => item.route && router.push(item.route)}
    >
      <View className={`w-11 h-11 rounded-2xl ${item.iconBg} items-center justify-center mr-4`}>
        <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-text-primary mb-0.5">{item.title}</Text>
        <Text className="text-xs font-medium text-text-secondary">{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}
