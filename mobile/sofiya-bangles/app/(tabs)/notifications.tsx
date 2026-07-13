import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotificationStore, AppNotification } from '../../src/store/notificationStore';

export default function NotificationsScreen() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { notifications, initialized, markAsRead, deleteNotifications } = useNotificationStore();

  const handleDelete = async (idsToDelete: string[]) => {
    Alert.alert('Delete Notifications', 'Are you sure you want to delete the selected notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          await deleteNotifications(idsToDelete);
          setSelectedIds([]);
          setIsEditMode(false);
        }
      }
    ]);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleNotificationPress = async (notif: AppNotification) => {
    if (isEditMode) {
      toggleSelection(notif.id);
    } else {
      // Mark as read in global store
      if (!notif.isRead) {
        await markAsRead(notif.id);
      }
      
      // Navigate to product
      if (notif.productId) {
        router.push({ pathname: '/products/[id]', params: { id: notif.productId } } as any);
      }
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="px-6 pb-6 bg-[#FFF0F3]" style={{ paddingTop: Math.max(insets.top + 16, 40) }}>
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-3xl font-extrabold text-[#FF1F4B]">Notifications 🔔</Text>
          <TouchableOpacity onPress={() => {
            if (isEditMode) {
              setIsEditMode(false);
              setSelectedIds([]);
            } else {
              setIsEditMode(true);
            }
          }}>
            <Text className="text-[#FF1F4B] font-bold text-sm">{isEditMode ? 'Cancel' : 'Select'}</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-slate-500 text-sm mb-2">Stay updated on your orders & offers</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {!initialized ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#FF1F4B" />
          </View>
        ) : (
          notifications.map((notif) => {
            const isSelected = selectedIds.includes(notif.id);
            return (
              <TouchableOpacity 
                key={notif.id} 
                onPress={() => handleNotificationPress(notif)}
                className={`bg-white p-4 rounded-2xl mb-4 shadow-sm flex-row items-center border ${isSelected ? 'border-[#FF1F4B] bg-rose-50' : 'border-slate-100'}`}
                style={{ borderLeftWidth: 3, borderLeftColor: notif.isRead || isSelected ? 'transparent' : '#FF1F4B' }}
              >
                {isEditMode && (
                  <View className="mr-3">
                    <Ionicons 
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                      size={24} 
                      color={isSelected ? "#FF1F4B" : "#cbd5e1"} 
                    />
                  </View>
                )}
                <View className="w-12 h-12 rounded-full bg-[#FF1F4B] items-center justify-center mr-4">
                <Ionicons name={notif.icon as any} size={20} color="white" />
              </View>
              
              <View className="flex-1">
                <View className="flex-row justify-between items-start mb-1">
                  <Text className="text-base font-bold text-slate-800">{notif.title}</Text>
                  {!notif.isRead && <View className="w-2 h-2 rounded-full bg-[#FF1F4B] mt-1" />}
                </View>
                <Text className="text-slate-500 text-sm leading-5 mb-1">{notif.desc}</Text>
                <Text className="text-slate-400 text-xs font-medium">{notif.time}</Text>
              </View>
              
              {!isEditMode && (
                <TouchableOpacity 
                  className="p-2 ml-1"
                  onPress={() => handleDelete([notif.id])}
                >
                  <Ionicons name="trash-outline" size={20} color="#cbd5e1" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            );
          })
        )}
        <View className="h-32" />
      </ScrollView>

      {isEditMode && selectedIds.length > 0 && (
        <View className="absolute bottom-6 left-6 right-6">
          <TouchableOpacity 
            className="bg-[#FF1F4B] py-4 rounded-full items-center shadow-lg flex-row justify-center gap-2"
            onPress={() => handleDelete(selectedIds)}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text className="text-white font-bold text-lg">Delete Selected ({selectedIds.length})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
