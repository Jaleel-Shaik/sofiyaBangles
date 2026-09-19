import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotificationStore, AppNotification } from '@/src/store/notificationStore';
import { AppIcon } from '@/src/constants/icons';
import { STRINGS } from '@/src/constants/strings';

export default function NotificationsScreen() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { notifications, initialized, markAsRead, deleteNotifications } = useNotificationStore();
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const handleDelete = async (idsToDelete: string[]) => {
    Alert.alert('Delete Notifications', 'Are you sure you want to delete the selected notifications?', [
      { text: STRINGS.common.cancel, style: 'cancel' },
      { 
        text: STRINGS.common.delete, 
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
      if (!notif.isRead) {
        await markAsRead(notif.id);
      }
      
      if (notif.productId) {
        router.push({ pathname: '/products/[id]', params: { id: notif.productId } } as any);
      }
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pb-5 bg-[#FFF0F3] rounded-b-3xl shadow-sm border-b border-rose-100" style={{ paddingTop: Math.max(insets.top + 16, 40) }}>
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-headline-lg font-extrabold text-primary">Notifications 🔔</Text>
          {safeNotifications.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                if (isEditMode) {
                  setIsEditMode(false);
                  setSelectedIds([]);
                } else {
                  setIsEditMode(true);
                }
              }}
              className="min-h-[44px] min-w-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={isEditMode ? STRINGS.common.cancel : 'Select notifications'}
            >
              <Text className="text-primary font-bold text-label-md">{isEditMode ? STRINGS.common.cancel : 'Select'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text className="text-text-secondary text-body-sm">Stay updated on your orders & offers</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {!initialized ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#e11d48" />
          </View>
        ) : safeNotifications.length === 0 ? (
          <View className="py-24 items-center justify-center px-6">
            <View className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 items-center justify-center mb-4">
              <AppIcon name="notificationsOutline" size={30} color="#e11d48" />
            </View>
            <Text className="text-title-md font-bold text-text-primary mb-1">No Notifications Yet</Text>
            <Text className="text-text-secondary text-body-sm text-center px-6">
              We'll let you know when new arrivals, bridal collections, or special offers drop!
            </Text>
          </View>
        ) : (
          safeNotifications.map((notif) => {
            const isSelected = selectedIds.includes(notif.id);
            return (
              <TouchableOpacity 
                key={notif.id} 
                onPress={() => handleNotificationPress(notif)}
                activeOpacity={0.8}
                className={`bg-white p-4 rounded-2xl mb-3 shadow-xs flex-row items-center ${isSelected ? 'bg-rose-50' : ''}`}
                style={{ 
                  borderWidth: 1, 
                  borderColor: isSelected ? '#e11d48' : '#f1f5f9',
                  borderLeftWidth: notif.isRead && !isSelected ? 1 : 3,
                  borderLeftColor: isSelected ? '#e11d48' : (notif.isRead ? '#f1f5f9' : '#e11d48')
                }}
              >
                {isEditMode && (
                  <View className="mr-3">
                    <AppIcon 
                      name={isSelected ? "checkCircle" : "cubeOutline"} 
                      size={22} 
                      color={isSelected ? "#e11d48" : "#cbd5e1"} 
                    />
                  </View>
                )}
                <View className="w-11 h-11 rounded-full bg-primary items-center justify-center mr-3.5 shadow-xs">
                  <AppIcon name={(notif.icon as any) || "notifications"} size={20} color="white" />
                </View>
              
                <View className="flex-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className="text-label-lg font-bold text-text-primary">{notif.title}</Text>
                    {!notif.isRead && <View className="w-2 h-2 rounded-full bg-primary mt-1" />}
                  </View>
                  <Text className="text-text-secondary text-body-sm leading-5 mb-1">{notif.desc}</Text>
                  <Text className="text-text-hint text-caption font-medium">{notif.time}</Text>
                </View>
              
                {!isEditMode && (
                  <TouchableOpacity 
                    className="w-11 h-11 items-center justify-center -mr-2"
                    onPress={() => handleDelete([notif.id])}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={STRINGS.common.delete}
                  >
                    <AppIcon name="close" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View className="h-32" />
      </ScrollView>

      {isEditMode && selectedIds.length > 0 && (
        <View className="absolute bottom-20 left-6 right-6 z-20">
          <TouchableOpacity 
            className="bg-primary py-4 rounded-full items-center shadow-lg flex-row justify-center min-h-[48px]"
            onPress={() => handleDelete(selectedIds)}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <AppIcon name="closeCircleFilled" size={20} color="white" />
            <Text className="text-white font-bold text-label-lg ml-2">Delete Selected ({selectedIds.length})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
