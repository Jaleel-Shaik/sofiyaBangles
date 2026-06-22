import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';

export default function AdminSettings() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <ScrollView className="flex-1 px-4 py-6">
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-rose-100 rounded-full items-center justify-center mb-4 border-4 border-white shadow-sm">
            <Ionicons name="person" size={48} color="#FF1F4B" />
          </View>
          <Text className="text-2xl font-extrabold text-slate-800">{user?.full_name || 'Admin User'}</Text>
          <Text className="text-sm text-slate-500 mt-1">{user?.email}</Text>
          <View className="bg-rose-100 px-3 py-1 rounded-full mt-2">
             <Text className="text-xs font-bold text-rose-700 uppercase">Admin</Text>
          </View>
        </View>

        <View className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 mb-6">
          <SettingItem icon="notifications-outline" title="Notifications" color="#3b82f6" />
          <SettingItem icon="lock-closed-outline" title="Privacy & Security" color="#10b981" />
          <SettingItem icon="help-circle-outline" title="Help & Support" color="#f59e0b" />
          <SettingItem icon="document-text-outline" title="Terms & Policies" color="#8b5cf6" hasBorder={false} />
        </View>

        <TouchableOpacity 
          className="flex-row items-center justify-center bg-white p-4 rounded-2xl shadow-sm border border-red-100 mb-8"
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text className="ml-2 font-bold text-red-500">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingItem({ icon, title, color, hasBorder = true }: { icon: any, title: string, color: string, hasBorder?: boolean }) {
  return (
    <TouchableOpacity className={`flex-row items-center py-4 ${hasBorder ? 'border-b border-slate-50' : ''}`}>
      <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: `${color}15` }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text className="flex-1 text-base font-medium text-slate-700">{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
    </TouchableOpacity>
  );
}
