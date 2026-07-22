import { Tabs, useRouter, Redirect, Href } from "expo-router";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from "@/src/store/authStore";

export default function AdminTabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user, isLoading } = useAuthStore();
  
  if (isLoading) return null;
  
  if (!token) return <Redirect href="/(auth)/login" />;
  
  // Only admin (not super_admin) can access mobile admin panel
  // super_admin must use the web portal exclusively
  if (user?.role !== 'admin') {
    if (user?.role === 'super_admin') {
      // Super Admin redirected to login - web portal only
      return <Redirect href="/(auth)/login" />;
    }
    if (user?.role === 'user') return <Redirect href="/(tabs)/home" />;
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
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "pricetag" : "pricetag-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarIcon: ({ color, size }) => (
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#C1275A',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: -20, // push it up out of the bar
              shadowColor: '#C1275A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <Ionicons name="add" size={32} color="#ffffff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "folder" : "folder-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="manage-model-types" options={{ href: null }} />
      <Tabs.Screen name="model-products/[id]" options={{ href: null }} />
      <Tabs.Screen name="edit-product/[id]" options={{ href: null }} />
      <Tabs.Screen name="add-success" options={{ href: null }} />
    </Tabs>
  );
}
