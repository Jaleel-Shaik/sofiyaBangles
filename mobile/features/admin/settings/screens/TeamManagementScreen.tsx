import { View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography as Text } from '@/src/components/ui/Typography';
import { Button } from '@/src/components/ui/Button';

export default function TeamManagementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const admins = [
    { id: 1, name: 'Suhail Shaik', role: 'Super Admin', email: 'suhail@sofiyabangles.com', avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: 2, name: 'Ayesha Khan', role: 'Manager', email: 'ayesha@sofiyabangles.com', avatar: 'https://i.pravatar.cc/150?u=2' },
    { id: 3, name: 'Ravi Kumar', role: 'Support Agent', email: 'ravi@sofiyabangles.com', avatar: 'https://i.pravatar.cc/150?u=3' },
  ];

  return (
    <View className="flex-1 bg-background">
      <View 
        className="px-5 pb-6 bg-surface shadow-sm flex-row items-center justify-between z-10 border-b border-divider"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity 
            className="mr-4"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text variant="body-sm" className="text-blue-600 font-medium uppercase tracking-wider mb-0.5">Admin Preferences</Text>
            <Text variant="title-lg" weight="bold" className="text-text-primary">Team</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-4 mt-2">
          <Text variant="body-md" weight="bold" className="text-text-primary">Active Members ({admins.length})</Text>
          <TouchableOpacity className="flex-row items-center">
            <Ionicons name="filter" size={16} color="#64748b" />
            <Text variant="body-sm" weight="bold" className="text-text-secondary ml-1">Filter</Text>
          </TouchableOpacity>
        </View>

        {admins.map((admin) => (
          <View key={admin.id} className="bg-surface p-4 rounded-2xl mb-4 border border-divider shadow-sm flex-row items-center">
            <Image 
              source={{ uri: admin.avatar }} 
              className="w-16 h-16 rounded-full bg-divider mr-4"
            />
            <View className="flex-1">
              <Text variant="body-md" weight="bold" className="text-text-primary mb-0.5">{admin.name}</Text>
              <Text variant="body-sm" className="text-text-secondary mb-1">{admin.email}</Text>
              <View className={`self-start px-2 py-0.5 rounded-md ${admin.role === 'Super Admin' ? 'bg-purple-100' : admin.role === 'Manager' ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                <Text variant="body-sm" weight="bold" className={`${admin.role === 'Super Admin' ? 'text-purple-700' : admin.role === 'Manager' ? 'text-blue-700' : 'text-emerald-700'} text-[10px]`}>
                  {admin.role}
                </Text>
              </View>
            </View>
            
            {admin.role !== 'Super Admin' && (
              <TouchableOpacity className="w-10 h-10 rounded-full bg-background items-center justify-center border border-divider">
                <Ionicons name="ellipsis-vertical" size={18} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <View className="h-10" />
      </ScrollView>

      <View className="p-5 bg-surface border-t border-divider pb-8">
        <Button 
          title="Invite New Admin" 
          onPress={() => {}}
          icon="person-add-outline"
          variant="primary"
          fullWidth
        />
      </View>
    </View>
  );
}
