import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNotificationStore } from "../store/notificationStore";
import { useAuthStore } from "../store/authStore";
import { AppIcon } from "../constants/icons";
import { navigateFromNotification } from "../utils/notificationNavigation";

export default function InAppNotificationBanner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeInAppBanner, dismissInAppBanner, markAsRead } = useNotificationStore();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismissInAppBanner();
    });
  }, [dismissInAppBanner, opacity, translateY]);

  useEffect(() => {
    if (activeInAppBanner) {
      // Clear any pending timer
      if (dismissTimer.current) clearTimeout(dismissTimer.current);

      // Slide in animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
          speed: 12,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 6 seconds
      dismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, 6000);
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [activeInAppBanner, handleDismiss, opacity, translateY]);

  if (!activeInAppBanner) return null;

  const handlePress = async () => {
    const notif = activeInAppBanner;
    handleDismiss();
    await markAsRead(notif.id);
    navigateFromNotification(router, notif, user?.role);
  };

  const isOrder =
    (notifType: string) =>
    notifType.includes("ORDER") || notifType.includes("SALE");

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top + 6, 16),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        style={styles.card}
      >
        {/* Leading Thumbnail or Icon */}
        <View style={styles.thumbnailContainer}>
          {activeInAppBanner.imageUrl ? (
            <Image
              source={{ uri: activeInAppBanner.imageUrl }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isOrder(activeInAppBanner.type)
                    ? "#3b82f6"
                    : "#e11d48",
                },
              ]}
            >
              <AppIcon
                name={(activeInAppBanner.icon as any) || "notifications"}
                size={18}
                color="#ffffff"
              />
            </View>
          )}
        </View>

        {/* Text Info */}
        <View style={styles.contentContainer}>
          <View style={styles.badgeRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.badgeText}>
              {activeInAppBanner.type.replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {activeInAppBanner.title}
          </Text>
          <Text style={styles.desc} numberOfLines={1}>
            {activeInAppBanner.desc}
          </Text>
        </View>

        {/* Action Button & Close */}
        <View style={styles.actionColumn}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
          <View style={styles.viewBadge}>
            <Text style={styles.viewBadgeText}>View</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ffe4e6",
  },
  thumbnailContainer: {
    marginRight: 10,
  },
  thumbnailImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e11d48",
    marginRight: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#e11d48",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  desc: {
    fontSize: 12,
    color: "#64748b",
  },
  actionColumn: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 44,
  },
  closeBtn: {
    padding: 2,
  },
  viewBadge: {
    backgroundColor: "#fff1f2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  viewBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e11d48",
  },
});
