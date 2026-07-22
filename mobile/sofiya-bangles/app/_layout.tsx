import { Stack, useRouter, useSegments, Href, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import { useSizeStore } from "../src/store/sizeStore";
import "../global.css";

export default function RootLayout() {
  const { isLoading, token, restoreToken, user } = useAuthStore();
  const { fetchPreferences } = useSizeStore();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    restoreToken();
  }, []);

  useEffect(() => {
    if (token && user) {
      fetchPreferences();
    }
  }, [token, user]);

  useEffect(() => {
    if (isLoading || !rootNavigationState?.key) return;

    const inAuthGroup = segments?.[0] === "(auth)";
    const onSplashScreen = !segments?.[0];
    
    // Root layout handles initial splash screen routing and redirecting away from auth when logged in.
    // Strict layout guards in (tabs) and (admin) handle unauthorized access prevention.
    if (onSplashScreen) {
      const timer = setTimeout(() => {
        if (!token) {
          router.replace("/(auth)/login");
        } else if (user?.role === 'super_admin') {
          // Super Admin must use the web portal - show message screen
          router.replace("/(auth)/login");
        } else if (user?.role === 'admin') {
          router.replace("/(admin)/(tabs)/dashboard");
        } else {
          router.replace("/(tabs)/home");
        }
      }, 2000);
      return () => clearTimeout(timer);
    } else if (inAuthGroup && token) {
      // If user is on login page but already logged in, redirect them out immediately
      if (user?.role === 'super_admin') {
        // Stay on login - web portal required message will show
      } else if (user?.role === 'admin') {
        router.replace("/(admin)/(tabs)/dashboard");
      } else {
        router.replace("/(tabs)/home");
      }
    }
  }, [token, segments, isLoading, user, rootNavigationState?.key]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="new-arrivals/index" />
        <Stack.Screen name="products/[id]" />
        <Stack.Screen name="category/[id]" />
      </Stack>
    </>
  );
}
