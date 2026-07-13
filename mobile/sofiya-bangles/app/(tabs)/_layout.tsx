import { Tabs, Redirect, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useFavoriteStore } from '../../src/store/favoriteStore';
import { useNotificationStore } from '../../src/store/notificationStore';
import { useAuthStore } from '../../src/store/authStore';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { fetchFavorites, initialized: favInit } = useFavoriteStore();
  const { fetchNotifications, initialized: notifInit, unreadCount } = useNotificationStore();
  const { token, user, isLoading } = useAuthStore();
  
  useEffect(() => {
    if (!favInit) {
      fetchFavorites();
    }
    if (!notifInit) {
      fetchNotifications();
    }
  }, [favInit, notifInit]);

  if (isLoading) return null;
  
  if (!token) return <Redirect href="/(auth)/login" />;
  if (user?.role !== 'user') {
    if (user?.role === 'admin') return <Redirect href="/(admin)/(tabs)/dashboard" />;
    return <Redirect href="/(auth)/login" />;
  }

  // We ensure there's a baseline of 10px padding on devices without safe area, plus extra space below text
  const bottomPadding = Math.max(insets.bottom, 10) + 8; 
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#e11d48', // rose-600
        tabBarInactiveTintColor: '#94a3b8', // slate-400
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingBottom: bottomPadding,
          paddingTop: 8,
          height: bottomPadding + 52, // 52px for the icon and text height
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "heart" : "heart-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? "notifications" : "notifications-outline"} size={26} color={color} />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
              )}
            </View>
          ),
        }}
      />
    <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="size-preferences"
        options={{
          href: null,
          title: 'My Sizes',
        }}
      />
    </Tabs>
  );
}
