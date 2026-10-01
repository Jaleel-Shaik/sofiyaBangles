import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import React, { useState, useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotificationStore, AppNotification } from '@/src/store/notificationStore';
import { useAuthStore } from '@/src/store/authStore';
import { AppIcon } from '@/src/constants/icons';
import { STRINGS } from '@/src/constants/strings';
import { navigateFromNotification } from '@/src/utils/notificationNavigation';

type NotificationFilterTab = 'ALL' | 'UNREAD';

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<NotificationFilterTab>('ALL');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    notifications,
    initialized,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    clearAllNotifications,
  } = useNotificationStore();

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const unread = safeNotifications.filter((n) => !n.isRead).length;
    return {
      ALL: safeNotifications.length,
      UNREAD: unread,
    };
  }, [safeNotifications]);

  // Filtered notifications based on active tab
  const filteredList = useMemo(() => {
    if (activeTab === 'UNREAD') {
      return safeNotifications.filter((n) => !n.isRead);
    }
    return safeNotifications;
  }, [safeNotifications, activeTab]);

  const handleDelete = async (idsToDelete: string[]) => {
    Alert.alert('Delete Notifications', 'Are you sure you want to remove the selected notifications?', [
      { text: STRINGS.common.cancel, style: 'cancel' },
      {
        text: STRINGS.common.delete,
        style: 'destructive',
        onPress: async () => {
          await deleteNotifications(idsToDelete);
          setSelectedIds([]);
          setIsEditMode(false);
        },
      },
    ]);
  };

  const handleClearAll = async () => {
    Alert.alert('Clear All Notifications', 'Are you sure you want to clear all notifications from your feed?', [
      { text: STRINGS.common.cancel, style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await clearAllNotifications();
          setSelectedIds([]);
          setIsEditMode(false);
        },
      },
    ]);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNotificationPress = async (notif: AppNotification) => {
    if (isEditMode) {
      toggleSelection(notif.id);
      return;
    }

    // Mark as read immediately
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }

    // Navigate to appropriate destination
    navigateFromNotification(router, notif, user?.role);
  };

  const getNotificationCategoryBadge = (notif: AppNotification) => {
    const typeLower = (notif.type || '').toLowerCase();
    const titleLower = (notif.title || '').toLowerCase();

    if (typeLower.includes('back_in_stock') || titleLower.includes('back in stock')) {
      return { label: 'BACK IN STOCK', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    }
    if (typeLower.includes('stock') || titleLower.includes('stock')) {
      return { label: 'RESTOCK', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' };
    }
    if (typeLower.includes('arrival') || titleLower.includes('arrival')) {
      return { label: 'NEW ARRIVAL', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    }
    if (typeLower.includes('order') || typeLower.includes('sale') || titleLower.includes('order')) {
      return { label: 'ORDER UPDATE', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    }
    return { label: 'ANNOUNCEMENT', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  };

  const getActionLabel = (notif: AppNotification) => {
    const typeLower = (notif.type || '').toLowerCase();
    if (typeLower.includes('order') || typeLower.includes('sale') || notif.orderId || notif.orderNumber) {
      return 'Track Order →';
    }
    if (notif.productId) {
      return 'View Product →';
    }
    if (typeLower.includes('arrival')) {
      return 'See New Arrivals →';
    }
    return 'Explore →';
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      {/* Top Header */}
      <View
        className="px-5 pb-3 bg-[#FFF0F3] rounded-b-3xl shadow-xs border-b border-rose-100"
        style={{ paddingTop: Math.max(insets.top + 12, 38) }}
      >
        <View className="flex-row justify-between items-center mb-1">
          <View className="flex-row items-center">
            <Text className="text-headline-md font-extrabold text-slate-900">Notifications</Text>
            {unreadCount > 0 && (
              <View className="ml-2.5 bg-primary px-2.5 py-0.5 rounded-full">
                <Text className="text-white text-caption font-bold">{unreadCount} new</Text>
              </View>
            )}
          </View>

          {safeNotifications.length > 0 && (
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => {
                  if (isEditMode) {
                    setIsEditMode(false);
                    setSelectedIds([]);
                  } else {
                    setIsEditMode(true);
                  }
                }}
                className="py-1 px-3 rounded-lg bg-rose-100"
                accessibilityRole="button"
                accessibilityLabel={isEditMode ? STRINGS.common.cancel : 'Select notifications'}
              >
                <Text className="text-primary font-bold text-label-sm">
                  {isEditMode ? STRINGS.common.cancel : 'Select'}
                </Text>
              </TouchableOpacity>

              {!isEditMode && (
                <TouchableOpacity
                  onPress={handleClearAll}
                  className="py-1 px-3 rounded-lg bg-white border border-rose-200"
                  accessibilityRole="button"
                  accessibilityLabel="Clear all notifications"
                >
                  <Text className="text-rose-600 font-bold text-label-sm">Clear All</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View className="flex-row justify-between items-center mt-1">
          <Text className="text-slate-500 text-body-sm">
            Stay updated with your orders, stock arrivals & offers
          </Text>
          {unreadCount > 0 && !isEditMode && (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text className="text-primary font-bold text-caption">Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row mt-3.5 pt-1"
          contentContainerStyle={{ gap: 8 }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-full flex-row items-center ${
              activeTab === 'ALL' ? 'bg-primary' : 'bg-white border border-rose-100'
            }`}
          >
            <Text
              className={`text-label-sm font-bold ${
                activeTab === 'ALL' ? 'text-white' : 'text-slate-600'
              }`}
            >
              All ({tabCounts.ALL})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('UNREAD')}
            className={`px-3.5 py-1.5 rounded-full flex-row items-center ${
              activeTab === 'UNREAD' ? 'bg-primary' : 'bg-white border border-rose-100'
            }`}
          >
            <Text
              className={`text-label-sm font-bold ${
                activeTab === 'UNREAD' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Unread ({tabCounts.UNREAD})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Notifications List */}
      <ScrollView
        className="flex-1 px-4 pt-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e11d48" />
        }
      >
        {!initialized ? (
          <View className="py-24 items-center justify-center">
            <ActivityIndicator size="large" color="#e11d48" />
            <Text className="text-slate-400 text-body-sm mt-3">Loading your notifications...</Text>
          </View>
        ) : filteredList.length === 0 ? (
          <View className="py-24 items-center justify-center px-6">
            <View className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 items-center justify-center mb-4">
              <AppIcon name="notificationsOutline" size={32} color="#e11d48" />
            </View>
            <Text className="text-title-md font-bold text-slate-800 mb-1">
              {activeTab === 'UNREAD' ? 'All Caught Up! 🎉' : 'No Notifications'}
            </Text>
            <Text className="text-slate-500 text-body-sm text-center px-4 mb-6">
              {activeTab === 'UNREAD'
                ? 'You have read all your notifications. We will notify you when new stock or deals drop.'
                : 'Discover our latest designer bangles, bridal sets, and daily wear collections.'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/search' as any)}
              className="bg-primary px-6 py-2.5 rounded-full shadow-xs"
            >
              <Text className="text-white font-bold text-label-md">Explore Bangles Collection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredList.map((notif) => {
            const isSelected = selectedIds.includes(notif.id);
            const badge = getNotificationCategoryBadge(notif);
            const actionText = getActionLabel(notif);

            return (
              <TouchableOpacity
                key={notif.id}
                onPress={() => handleNotificationPress(notif)}
                activeOpacity={0.88}
                className={`bg-white rounded-2xl mb-3.5 shadow-xs overflow-hidden ${
                  isSelected ? 'bg-rose-50/70 border-primary' : 'border-slate-100'
                }`}
                style={{
                  borderWidth: 1,
                  borderLeftWidth: notif.isRead && !isSelected ? 1 : 4,
                  borderLeftColor: isSelected ? '#e11d48' : notif.isRead ? '#f1f5f9' : '#e11d48',
                }}
              >
                <View className="p-4">
                  <View className="flex-row items-start">
                    {/* Multi-select checkbox in Edit Mode */}
                    {isEditMode && (
                      <View className="mr-3 self-center">
                        <AppIcon
                          name={isSelected ? 'checkCircle' : 'cubeOutline'}
                          size={22}
                          color={isSelected ? '#e11d48' : '#cbd5e1'}
                        />
                      </View>
                    )}

                    {/* Leading Thumbnail or Icon */}
                    <View className="mr-3.5 relative">
                      {notif.imageUrl ? (
                        <Image
                          source={{ uri: notif.imageUrl }}
                          className="w-13 h-13 rounded-2xl bg-slate-100"
                          style={{ width: 52, height: 52, borderRadius: 14 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          className={`w-13 h-13 rounded-2xl items-center justify-center shadow-xs ${
                            badge.label === 'ORDER UPDATE'
                              ? 'bg-blue-600'
                              : badge.label === 'NEW ARRIVAL'
                              ? 'bg-purple-600'
                              : 'bg-primary'
                          }`}
                          style={{ width: 52, height: 52, borderRadius: 14 }}
                        >
                          <AppIcon
                            name={(notif.icon as any) || 'notifications'}
                            size={24}
                            color="white"
                          />
                        </View>
                      )}

                      {!notif.isRead && (
                        <View className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary border-2 border-white" />
                      )}
                    </View>

                    {/* Middle Content */}
                    <View className="flex-1">
                      {/* Category Badge & Timestamp */}
                      <View className="flex-row justify-between items-center mb-1">
                        <View className={`px-2 py-0.5 rounded-md border ${badge.bg} ${badge.border}`}>
                          <Text className={`text-[10px] font-extrabold tracking-wider ${badge.text}`}>
                            {badge.label}
                          </Text>
                        </View>
                        <Text className="text-slate-400 text-caption font-medium">{notif.time}</Text>
                      </View>

                      {/* Title */}
                      <Text
                        className={`text-label-lg font-bold mb-1 ${
                          notif.isRead ? 'text-slate-700' : 'text-slate-900'
                        }`}
                        numberOfLines={2}
                      >
                        {notif.title}
                      </Text>

                      {/* Description */}
                      <Text className="text-slate-500 text-body-sm leading-5 mb-2.5" numberOfLines={3}>
                        {notif.desc}
                      </Text>

                      {/* Action Link Footer */}
                      <View className="flex-row items-center justify-between pt-1 border-t border-slate-50">
                        <Text className="text-primary font-bold text-label-sm">{actionText}</Text>
                        {!isEditMode && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation?.();
                              handleDelete([notif.id]);
                            }}
                            className="p-1 -mr-1"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={STRINGS.common.delete}
                          >
                            <AppIcon name="close" size={16} color="#94a3b8" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View className="h-32" />
      </ScrollView>

      {/* Floating Action Bar when selecting in Edit Mode */}
      {isEditMode && selectedIds.length > 0 && (
        <View className="absolute bottom-20 left-6 right-6 z-20">
          <TouchableOpacity
            className="bg-primary py-4 rounded-full items-center shadow-lg flex-row justify-center min-h-[48px]"
            onPress={() => handleDelete(selectedIds)}
            activeOpacity={0.88}
            accessibilityRole="button"
          >
            <AppIcon name="closeCircleFilled" size={20} color="white" />
            <Text className="text-white font-bold text-label-lg ml-2">
              Delete Selected ({selectedIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
