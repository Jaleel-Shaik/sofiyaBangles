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
import { useNotificationStore, AppNotification } from '@/src/store/notificationStore';
import { useAuthStore } from '@/src/store/authStore';
import { AppIcon } from '@/src/constants/icons';
import { STRINGS } from '@/src/constants/strings';
import { navigateFromNotification } from '@/src/utils/notificationNavigation';
import { colors, spacing, radius, typography, touchTargets } from '@/src/theme/tokens';

/**
 * Universal Mobile Customer Notifications Screen.
 * Strictly compliant with Sofiya Bangles Design System & Tokens.
 */
export default function NotificationsScreen() {
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

  // Automatically refresh notifications every time screen comes into focus
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

  const handleDelete = async (idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;
    const isSingle = idsToDelete.length === 1;

    Alert.alert(
      isSingle ? 'Delete Notification' : 'Delete Notifications',
      isSingle
        ? 'Are you sure you want to remove this notification?'
        : `Are you sure you want to remove ${idsToDelete.length} selected notifications?`,
      [
        { text: STRINGS.common.cancel, style: 'cancel' },
        {
          text: STRINGS.common.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteNotifications(idsToDelete);
            setSelectedIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
            if (isEditMode && selectedIds.length <= idsToDelete.length) {
              setIsEditMode(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications from your feed?',
      [
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
      ]
    );
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === safeNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(safeNotifications.map((n) => n.id));
    }
  };

  const handleNotificationPress = async (notif: AppNotification) => {
    if (isEditMode) {
      toggleSelection(notif.id);
      return;
    }

    if (!notif.isRead) {
      await markAsRead(notif.id);
    }

    navigateFromNotification(router, notif, user?.role);
  };

  /**
   * Extracts clean Product Name from notification title.
   */
  const getCleanProductName = (notif: AppNotification): string => {
    let title = (notif.title || '').trim();
    const prefixRegex =
      /^(back\s+in\s+stock|new\s+arrival|restock(ed)?|stock\s+alert|exclusive\s+offer|flash\s+sale|special\s+discount|limited\s+offer|product\s+alert)\s*[:\-–]\s*/i;
    title = title.replace(prefixRegex, '').trim();
    return title || 'Bangles Collection';
  };

  /**
   * Generates a concise, exact 2-word short description.
   */
  const getShortDescription = (notif: AppNotification): string => {
    const typeLower = (notif.type || '').toLowerCase();
    const titleLower = (notif.title || '').toLowerCase();
    const descLower = (notif.desc || '').toLowerCase();

    if (
      titleLower.includes('out of stock') ||
      descLower.includes('out of stock') ||
      descLower.includes('sold out') ||
      typeLower.includes('out_of_stock')
    ) {
      return 'Out of stock';
    }
    if (
      titleLower.includes('limited stock') ||
      descLower.includes('limited stock') ||
      descLower.includes('only ') ||
      typeLower.includes('low_stock')
    ) {
      return 'Limited stock';
    }
    if (
      typeLower.includes('back_in_stock') ||
      titleLower.includes('back in stock') ||
      descLower.includes('back in stock')
    ) {
      return 'Back in stock';
    }
    if (
      typeLower.includes('stock') ||
      titleLower.includes('restock') ||
      descLower.includes('restock') ||
      titleLower.includes('stock increased') ||
      descLower.includes('fresh stock')
    ) {
      return 'Restocked now';
    }
    if (
      typeLower.includes('arrival') ||
      titleLower.includes('arrival') ||
      descLower.includes('arrival')
    ) {
      return 'New arrival';
    }
    if (
      typeLower.includes('order') ||
      typeLower.includes('sale') ||
      notif.orderId ||
      notif.orderNumber ||
      titleLower.includes('order')
    ) {
      if (descLower.includes('deliver') || titleLower.includes('deliver')) return 'Order delivered';
      if (descLower.includes('ship') || titleLower.includes('ship')) return 'Order shipped';
      return 'Order placed';
    }
    if (
      titleLower.includes('discount') ||
      titleLower.includes('offer') ||
      descLower.includes('discount')
    ) {
      return 'Special offer';
    }
    if (descLower.includes('limited')) {
      return 'Limited stock';
    }

    const words = (notif.desc || notif.title || '').trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0]} ${words[1]}`;
    }
    return 'Ready to ship';
  };

  /**
   * Resolves category icon and semantic color tints strictly using tokens.ts.
   */
  const getCategoryMeta = (notif: AppNotification) => {
    const typeLower = (notif.type || '').toLowerCase();
    const titleLower = (notif.title || '').toLowerCase();
    const descLower = (notif.desc || '').toLowerCase();

    if (
      titleLower.includes('out of stock') ||
      descLower.includes('out of stock') ||
      descLower.includes('sold out') ||
      typeLower.includes('out_of_stock')
    ) {
      return {
        iconName: 'closeCircle' as const,
        iconBg: colors.status.errorLight,
        iconColor: colors.status.error,
        borderColor: colors.status.error,
      };
    }

    if (
      titleLower.includes('limited stock') ||
      descLower.includes('limited stock') ||
      descLower.includes('only ') ||
      typeLower.includes('low_stock')
    ) {
      return {
        iconName: 'timeOutline' as const,
        iconBg: colors.status.warningLight,
        iconColor: colors.status.warning,
        borderColor: colors.status.warning,
      };
    }

    if (typeLower.includes('arrival') || titleLower.includes('arrival')) {
      return {
        iconName: 'sparklesOutline' as const,
        iconBg: colors.brand.primaryLight,
        iconColor: colors.brand.primary,
        borderColor: colors.brand.primary,
      };
    }

    if (typeLower.includes('stock') || titleLower.includes('stock') || notif.productId) {
      return {
        iconName: 'cubeOutline' as const,
        iconBg: colors.status.successLight,
        iconColor: colors.status.success,
        borderColor: colors.status.success,
      };
    }

    if (
      typeLower.includes('order') ||
      typeLower.includes('sale') ||
      notif.orderId ||
      notif.orderNumber ||
      titleLower.includes('order')
    ) {
      return {
        iconName: 'bagOutline' as const,
        iconBg: colors.status.infoLight,
        iconColor: colors.status.info,
        borderColor: colors.status.info,
      };
    }

    return {
      iconName: 'notificationsOutline' as const,
      iconBg: colors.brand.primaryLight,
      iconColor: colors.brand.primary,
      borderColor: colors.brand.primary,
    };
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface.secondary }}>
      {/* Top Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top + spacing[2], spacing[8]),
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[3],
          backgroundColor: colors.surface.primary,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.default,
        }}
      >
        <View className="flex-row justify-between items-center mb-1">
          <View className="flex-row items-center">
            <Text
              style={[typography.headlineSm, { color: colors.text.primary }]}
            >
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View
                style={{
                  marginLeft: spacing[2],
                  paddingHorizontal: spacing[2],
                  paddingVertical: 2,
                  borderRadius: radius.full,
                  backgroundColor: colors.brand.primaryLight,
                  borderWidth: 1,
                  borderColor: colors.border.brand,
                }}
              >
                <Text
                  style={[typography.caption, { color: colors.brand.primary, fontWeight: '700' }]}
                >
                  {unreadCount} new
                </Text>
              </View>
            )}
          </View>

          {safeNotifications.length > 0 && (
            <View className="flex-row items-center" style={{ gap: spacing[2] }}>
              {/* Select Option Button */}
              <TouchableOpacity
                onPress={() => {
                  if (isEditMode) {
                    setIsEditMode(false);
                    setSelectedIds([]);
                  } else {
                    setIsEditMode(true);
                  }
                }}
                style={{
                  minWidth: touchTargets.minWidth,
                  minHeight: 36,
                  paddingHorizontal: spacing[3],
                  borderRadius: radius.full,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isEditMode ? colors.brand.primary : colors.brand.primaryLight,
                  borderWidth: isEditMode ? 0 : 1,
                  borderColor: colors.border.brand,
                  gap: 6,
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={isEditMode ? STRINGS.common.cancel : 'Select notifications'}
              >
                <AppIcon
                  name={isEditMode ? 'close' : 'checkCircle'}
                  size={16}
                  color={isEditMode ? colors.text.inverse : colors.brand.primary}
                />
                <Text
                  style={[
                    typography.labelSm,
                    { color: isEditMode ? colors.text.inverse : colors.brand.primary, fontWeight: '700' },
                  ]}
                >
                  {isEditMode ? 'Done' : 'Select'}
                </Text>
              </TouchableOpacity>

              {!isEditMode && (
                <TouchableOpacity
                  onPress={handleClearAll}
                  style={{
                    minWidth: touchTargets.minWidth,
                    minHeight: 36,
                    paddingHorizontal: spacing[3],
                    borderRadius: radius.full,
                    backgroundColor: colors.surface.primary,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all notifications"
                >
                  <Text
                    style={[typography.labelSm, { color: colors.text.secondary, fontWeight: '600' }]}
                  >
                    Clear All
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Subtitle & Mark All Read */}
        {!isEditMode && (
          <View className="flex-row justify-between items-center mt-0.5">
            <Text
              style={[typography.caption, { color: colors.text.secondary, flex: 1, paddingRight: spacing[2] }]}
              numberOfLines={1}
            >
              All your bangle arrivals, orders & offers in one place
            </Text>

            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                style={{ paddingVertical: spacing[1], paddingHorizontal: spacing[1] }}
                hitSlop={touchTargets.hitSlop}
                accessibilityRole="button"
                accessibilityLabel="Mark all as read"
              >
                <Text
                  style={[typography.caption, { color: colors.brand.primary, fontWeight: '700' }]}
                >
                  Mark all read
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Selection Toolbar Banner (Active in Edit Mode) */}
      {isEditMode && safeNotifications.length > 0 && (
        <View
          style={{
            marginHorizontal: spacing[4],
            marginTop: spacing[2],
            marginBottom: spacing[2],
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            borderRadius: radius.xl,
            backgroundColor: colors.brand.primaryLight,
            borderWidth: 1,
            borderColor: colors.border.brand,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View className="flex-row items-center" style={{ gap: spacing[2] }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: radius.full,
                backgroundColor: colors.brand.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.text.inverse, fontSize: 11, fontWeight: '700' }}>
                {selectedIds.length}
              </Text>
            </View>
            <Text style={[typography.labelSm, { color: colors.text.primary, fontWeight: '700' }]}>
              {selectedIds.length === 0
                ? 'Choose items to delete'
                : `${selectedIds.length} of ${safeNotifications.length} Selected`}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSelectAll}
            style={{
              paddingHorizontal: spacing[3],
              paddingVertical: 6,
              borderRadius: radius.full,
              backgroundColor: colors.surface.primary,
              borderWidth: 1,
              borderColor: colors.border.brand,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              selectedIds.length === safeNotifications.length ? 'Deselect all' : 'Select all'
            }
          >
            <AppIcon
              name={
                selectedIds.length === safeNotifications.length
                  ? 'closeCircle'
                  : 'checkCircle'
              }
              size={15}
              color={colors.brand.primary}
            />
            <Text style={[typography.labelSm, { color: colors.brand.primary, fontWeight: '700' }]}>
              {selectedIds.length === safeNotifications.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications Unified Feed */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: spacing[3], paddingTop: spacing[2] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
      >
        {!initialized ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text
              style={[typography.caption, { color: colors.text.muted, marginTop: spacing[2] }]}
            >
              Loading notifications...
            </Text>
          </View>
        ) : safeNotifications.length === 0 ? (
          <View className="py-20 items-center justify-center" style={{ paddingHorizontal: spacing[6] }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.full,
                backgroundColor: colors.brand.primaryLight,
                borderWidth: 1,
                borderColor: colors.border.brand,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing[3],
              }}
            >
              <AppIcon name="notificationsOutline" size={30} color={colors.brand.primary} />
            </View>
            <Text
              style={[typography.titleMd, { color: colors.text.primary, marginBottom: spacing[1] }]}
            >
              No Notifications
            </Text>
            <Text
              style={[
                typography.bodySm,
                { color: colors.text.secondary, textAlign: 'center', paddingHorizontal: spacing[4], marginBottom: spacing[5] },
              ]}
            >
              You are all caught up! When new bangles arrive or stock is updated, you'll see it here.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/search' as any)}
              style={{
                minHeight: touchTargets.minHeight,
                paddingHorizontal: spacing[6],
                paddingVertical: spacing[2],
                borderRadius: radius.full,
                backgroundColor: colors.brand.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Explore Bangles Collection"
            >
              <Text
                style={[typography.labelLg, { color: colors.text.inverse, fontWeight: '700' }]}
              >
                Explore Bangles Collection
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          safeNotifications.map((notif) => {
            const isSelected = selectedIds.includes(notif.id);
            const productName = getCleanProductName(notif);
            const shortDesc = getShortDescription(notif);
            const meta = getCategoryMeta(notif);

            return (
              <TouchableOpacity
                key={notif.id}
                onPress={() => handleNotificationPress(notif)}
                activeOpacity={0.85}
                style={{
                  borderRadius: radius.lg,
                  marginBottom: spacing[2],
                  borderWidth: 1,
                  borderColor: isSelected
                    ? colors.border.brand
                    : notif.isRead
                    ? colors.border.default
                    : colors.border.subtle,
                  backgroundColor: isSelected
                    ? colors.brand.primaryLight
                    : colors.surface.primary,
                  borderLeftWidth: isSelected ? 4 : notif.isRead ? 1 : 3.5,
                  borderLeftColor: isSelected
                    ? colors.brand.primary
                    : notif.isRead
                    ? colors.border.default
                    : meta.borderColor,
                }}
                accessibilityRole="button"
                accessibilityLabel={`${productName}, ${shortDesc}`}
              >
                <View
                  style={{
                    paddingVertical: spacing[3],
                    paddingHorizontal: spacing[3],
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  {/* Multi-Radio Select Circular Option */}
                  {isEditMode && (
                    <TouchableOpacity
                      onPress={() => toggleSelection(notif.id)}
                      style={{
                        minWidth: touchTargets.minWidth,
                        minHeight: touchTargets.minHeight,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: -spacing[1],
                        marginRight: spacing[1],
                      }}
                      hitSlop={touchTargets.hitSlop}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`Select ${productName}`}
                    >
                      {isSelected ? (
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: radius.full,
                            backgroundColor: colors.brand.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: colors.brand.primary,
                          }}
                        >
                          <AppIcon name="check" size={12} color={colors.text.inverse} />
                        </View>
                      ) : (
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: radius.full,
                            borderWidth: 2,
                            borderColor: colors.border.strong,
                            backgroundColor: colors.surface.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Leading Compact Thumbnail or Icon (42x42) */}
                  <View style={{ marginRight: spacing[3], position: 'relative' }}>
                    {notif.imageUrl ? (
                      <Image
                        source={{ uri: notif.imageUrl }}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: radius.md,
                          backgroundColor: colors.surface.muted,
                          borderWidth: 1,
                          borderColor: colors.border.default,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: radius.md,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: meta.iconBg,
                        }}
                      >
                        <AppIcon
                          name={meta.iconName}
                          size={20}
                          color={meta.iconColor}
                        />
                      </View>
                    )}

                    {!notif.isRead && (
                      <View
                        style={{
                          position: 'absolute',
                          top: -1,
                          right: -1,
                          width: 10,
                          height: 10,
                          borderRadius: radius.full,
                          backgroundColor: colors.brand.primary,
                          borderWidth: 2,
                          borderColor: colors.surface.primary,
                        }}
                        accessibilityLabel="Unread notification indicator"
                      />
                    )}
                  </View>

                  {/* Center Content: Product Name (Top) & Short 2-word Description (Bottom) */}
                  <View style={{ flex: 1, justifyContent: 'center', marginRight: spacing[2] }}>
                    {/* Product Name */}
                    <Text
                      style={[
                        typography.titleSm,
                        {
                          color: isSelected
                            ? colors.brand.primary
                            : notif.isRead
                            ? colors.text.secondary
                            : colors.text.primary,
                          fontWeight: notif.isRead ? '600' : '700',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {productName}
                    </Text>

                    {/* Short Description (2 words) + Relative Time */}
                    <View className="flex-row items-center" style={{ marginTop: 2 }}>
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: isSelected ? colors.brand.primaryDark : colors.text.secondary,
                            fontWeight: '500',
                          },
                        ]}
                      >
                        {shortDesc}
                      </Text>
                      <Text
                        style={{
                          color: colors.text.muted,
                          fontSize: 10,
                          marginHorizontal: 6,
                        }}
                      >
                        •
                      </Text>
                      <Text
                        style={[typography.caption, { color: colors.text.muted }]}
                      >
                        {notif.time}
                      </Text>
                    </View>
                  </View>

                  {/* Right Column: Quick Single-Delete Icon */}
                  {!isEditMode && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleDelete([notif.id]);
                      }}
                      style={{
                        minWidth: 36,
                        minHeight: 36,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: -spacing[1],
                      }}
                      hitSlop={touchTargets.hitSlop}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete notification: ${productName}`}
                    >
                      <AppIcon name="close" size={16} color={colors.text.muted} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: spacing[24] }} />
      </ScrollView>

      {/* Floating Action Bar in Selection Mode */}
      {isEditMode && selectedIds.length > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: spacing[5],
            left: spacing[4],
            right: spacing[4],
            zIndex: 20,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: colors.brand.primary,
              minHeight: 48,
              paddingVertical: spacing[3],
              paddingHorizontal: spacing[5],
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              shadowColor: colors.brand.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
            onPress={() => handleDelete(selectedIds)}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${selectedIds.length} selected notifications`}
          >
            <AppIcon name="closeCircleFilled" size={18} color={colors.text.inverse} />
            <Text
              style={[
                typography.labelLg,
                { color: colors.text.inverse, fontWeight: '700', marginLeft: spacing[2] },
              ]}
            >
              Delete Selected ({selectedIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
