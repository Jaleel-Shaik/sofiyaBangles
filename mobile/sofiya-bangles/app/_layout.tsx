import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/src/store/authStore";
import "../global.css";

export default function RootLayout() {
  const { token } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  // Only handles redirecting from auth screens when already logged in
  // SplashScreen handles restoreToken and its own navigation
  // SplashScreen handles its own navigation after animation completes
  useEffect(() => {
    if (!token || !rootNavigationState?.key) return;

    const inAuthGroup = segments?.[0] === "(auth)";
    
    if (inAuthGroup) {
      // If user is on login page but already logged in, redirect them out
      router.replace("/(tabs)/home");
    }
  }, [token, segments, rootNavigationState?.key]);

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
