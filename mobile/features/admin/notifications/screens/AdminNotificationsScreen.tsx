import React, { useState, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useAdminNotificationStore,
  getAdminNotificationCategory,
  formatAdminRelativeTime,
  AdminNotificationCategory,
} from '@/src/store/adminNotificationStore';
import type { AdminNotificationItem } from '@/src/api/admin';
import { useAuthStore } from '@/src/store/authStore';

export default function AdminNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminNotificationCategory>('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    notifications,
    unreadCount,
    initialized,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
  } = useAdminNotificationStore();

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleNotificationPress = async (n: AdminNotificationItem) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }

    const cat = getAdminNotificationCategory(n);
    if (cat === 'orders') {
      // In mobile admin, orders or sales can route to quick sell or dashboard
      router.push('/(admin)/(tabs)/dashboard' as any);
      return;
    }

    if (cat === 'stock' || cat === 'arrivals') {
      if (n.product_id) {
        router.push(`/(admin)/(tabs)/product-detail/${n.product_id}` as any);
      } else {
        router.push('/(admin)/(tabs)/products' as any);
      }
      return;
    }

    if (cat === 'reviews') {
      router.push('/(admin)/reviews' as any);
      return;
    }

    // Default route to dashboard
    router.push('/(admin)/(tabs)/dashboard' as any);
  };

  const handleDelete = (id: string, title?: string) => {
    Alert.alert(
      'Delete Alert',
      `Are you sure you want to dismiss this notification?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNotification(id);
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all operational alerts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
          },
        },
      ]
    );
  };

  const tabCounts = {
    all: notifications.length,
    unread: unreadCount,
    orders: notifications.filter((n) => getAdminNotificationCategory(n) === 'orders').length,
    stock: notifications.filter((n) => getAdminNotificationCategory(n) === 'stock').length,
    reviews: notifications.filter((n) => getAdminNotificationCategory(n) === 'reviews').length,
    arrivals: notifications.filter((n) => getAdminNotificationCategory(n) === 'arrivals').length,
  };

  const filteredNotifications = notifications.filter((n) => {
    const cat = getAdminNotificationCategory(n);
    if (activeTab === 'unread') return !n.is_read;
    if (activeTab === 'orders') return cat === 'orders';
    if (activeTab === 'stock') return cat === 'stock';
    if (activeTab === 'reviews') return cat === 'reviews';
    if (activeTab === 'arrivals') return cat === 'arrivals';
    return true;
  });

  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'orders':
        return {
          label: 'SALE / ORDER',
          badgeBg: 'bg-emerald-50 border border-emerald-200',
          badgeText: 'text-emerald-700',
          iconName: 'bag-check' as const,
          iconBg: 'bg-emerald-500',
          borderColor: '#059669',
          actionText: 'View Order Details →',
        };
      case 'stock':
        return {
          label: 'INVENTORY ALERT',
          badgeBg: 'bg-amber-50 border border-amber-200',
          badgeText: 'text-amber-700',
          iconName: 'cube' as const,
          iconBg: 'bg-amber-500',
          borderColor: '#d97706',
          actionText: 'Manage Inventory →',
        };
      case 'arrivals':
        return {
          label: 'NEW ARRIVAL',
          badgeBg: 'bg-rose-50 border border-rose-200',
          badgeText: 'text-rose-700',
          iconName: 'sparkles' as const,
          iconBg: 'bg-rose-500',
          borderColor: '#e11d48',
          actionText: 'View Product →',
        };
      case 'reviews':
        return {
          label: 'CUSTOMER REVIEW',
          badgeBg: 'bg-blue-50 border border-blue-200',
          badgeText: 'text-blue-700',
          iconName: 'star' as const,
          iconBg: 'bg-blue-500',
          borderColor: '#2563eb',
          actionText: 'Read Review →',
        };
      default:
        return {
          label: 'SYSTEM ALERT',
          badgeBg: 'bg-slate-100 border border-slate-200',
          badgeText: 'text-slate-700',
          iconName: 'notifications' as const,
          iconBg: 'bg-slate-500',
          borderColor: '#64748b',
          actionText: 'Inspect Alert →',
        };
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {/* Top Header */}
      <View
        className="px-4 pb-3 bg-white border-b border-slate-200 shadow-xs"
        style={{ paddingTop: Math.max(insets.top + 8, 36) }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3 active:bg-slate-200"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </TouchableOpacity>

            <View className="flex-1">
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <View className="bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  <Text className="text-rose-600 font-black text-[9px] uppercase tracking-wider">
                    {user?.role === 'super_admin' ? 'Super Admin Ops' : 'Store Admin Ops'}
                  </Text>
                </View>
                {unreadCount > 0 && (
                  <View className="bg-rose-500 px-1.5 py-0.2 rounded-full">
                    <Text className="text-white font-bold text-[9px]">
                      {unreadCount} new
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-lg font-black text-slate-900 tracking-tight" numberOfLines={1}>
                Operations Alerts
              </Text>
            </View>
          </View>

          {/* Header Action Buttons */}
          <View className="flex-row items-center gap-1.5">
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={markAllAsRead}
                className="h-8 px-2.5 rounded-lg bg-rose-50 border border-rose-200 flex-row items-center gap-1"
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done" size={14} color="#e11d48" />
                <Text className="text-rose-600 font-bold text-xs">Read All</Text>
              </TouchableOpacity>
            )}

            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={handleClearAll}
                className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center active:bg-slate-200"
                accessibilityLabel="Clear all alerts"
              >
                <Ionicons name="trash-outline" size={15} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 flex-row"
          contentContainerStyle={{ gap: 6, paddingRight: 10 }}
        >
          {(
            [
              { id: 'all' as const, label: 'All', count: tabCounts.all },
              { id: 'unread' as const, label: 'Unread', count: tabCounts.unread },
              { id: 'orders' as const, label: 'Sales & Orders', count: tabCounts.orders },
              { id: 'stock' as const, label: 'Stock Alerts', count: tabCounts.stock },
              { id: 'reviews' as const, label: 'Reviews', count: tabCounts.reviews },
              { id: 'arrivals' as const, label: 'New Arrivals', count: tabCounts.arrivals },
            ]
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl flex-row items-center gap-1.5 ${
                  isActive
                    ? 'bg-rose-600 shadow-xs'
                    : 'bg-slate-100'
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    className={`px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20' : 'bg-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black ${
                        isActive ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Alert Feed */}
      <ScrollView
        className="flex-1 px-4 pt-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e11d48"
            colors={['#e11d48']}
          />
        }
      >
        {!initialized ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#e11d48" />
            <Text className="text-slate-400 text-xs mt-2.5">
              Loading operational alerts...
            </Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View className="py-20 items-center justify-center px-6">
            <View className="w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="file-tray-outline" size={32} color="#94a3b8" />
            </View>
            <Text className="text-base font-black text-slate-800 mb-1">
              No Operational Alerts
            </Text>
            <Text className="text-xs text-slate-500 text-center max-w-[280px]">
              {activeTab === 'unread'
                ? 'All alerts have been reviewed. Store operations are running smoothly!'
                : activeTab === 'orders'
                ? 'No online orders or counter sales logged in this view.'
                : activeTab === 'stock'
                ? 'All products are safely in stock. No low-stock warnings.'
                : activeTab === 'reviews'
                ? 'No new customer reviews or ratings pending.'
                : 'You will receive real-time notifications here when store sales, stock warnings, or reviews arrive.'}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((n) => {
            const cat = getAdminNotificationCategory(n);
            const meta = getCategoryMeta(cat);
            const isUnread = !n.is_read;

            const titleText = n.title || '';
            const bodyText = n.body || n.message || '';
            const chipCode =
              n.order_number ||
              (titleText.match(/ORD-[\w\d-]+/i)?.[0] || bodyText.match(/ORD-[\w\d-]+/i)?.[0] || '')?.replace(/^#/, '') ||
              n.unique_code;

            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => handleNotificationPress(n)}
                activeOpacity={0.88}
                className={`mb-2.5 rounded-2xl p-3.5 border shadow-2xs ${
                  isUnread
                    ? 'bg-rose-50/50 border-rose-200'
                    : 'bg-white border-slate-200/80'
                }`}
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: meta.borderColor,
                }}
              >
                <View className="flex-row items-start gap-3">
                  {/* Visual Icon / Thumbnail */}
                  <View className="relative shrink-0">
                    {n.image_url ? (
                      <Image
                        source={{ uri: n.image_url }}
                        className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200"
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        className={`w-11 h-11 rounded-xl items-center justify-center shadow-xs ${meta.iconBg}`}
                      >
                        <Ionicons name={meta.iconName} size={20} color="#ffffff" />
                      </View>
                    )}

                    {isUnread && (
                      <View className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white" />
                    )}
                  </View>

                  {/* Body Content */}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between gap-1 mb-1">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        {/* Category Pill */}
                        <View className={`px-1.5 py-0.5 rounded-md ${meta.badgeBg}`}>
                          <Text className={`text-[9px] font-black uppercase ${meta.badgeText}`}>
                            {meta.label}
                          </Text>
                        </View>

                        {/* Order # or Unique Code Tag */}
                        {chipCode && (
                          <View className="px-1.5 py-0.5 rounded bg-slate-100">
                            <Text className="text-[10px] font-mono font-bold text-slate-600">
                              {chipCode}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text className="text-[10px] font-medium text-slate-400">
                        {formatAdminRelativeTime(n.created_at)}
                      </Text>
                    </View>

                    {/* Title */}
                    <Text
                      className={`text-xs text-slate-900 leading-snug ${
                        isUnread ? 'font-black' : 'font-bold'
                      }`}
                      numberOfLines={1}
                    >
                      {n.title}
                    </Text>

                    {/* Message / Description */}
                    <Text
                      className="text-[11px] text-slate-600 mt-0.5 leading-relaxed"
                      numberOfLines={2}
                    >
                      {n.body || n.message}
                    </Text>

                    {/* Action Bar */}
                    <View className="flex-row items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                      <Text
                        className="text-[10px] font-bold"
                        style={{ color: meta.borderColor }}
                      >
                        {meta.actionText}
                      </Text>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleDelete(n.id, n.title);
                        }}
                        className="w-7 h-7 rounded-md items-center justify-center active:bg-slate-100"
                        accessibilityLabel="Delete alert"
                      >
                        <Ionicons name="close" size={15} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
