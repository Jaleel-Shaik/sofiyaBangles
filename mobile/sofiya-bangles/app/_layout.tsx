import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import "../global.css";

export default function RootLayout() {
  const { isLoading, token, restoreToken, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreToken();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const onSplashScreen = !segments || segments[0] === undefined;
    
    if (!token && !inAuthGroup) {
      // Not logged in, redirect to login
      const delay = onSplashScreen ? 2000 : 0;
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, delay);
    } else if (token && (inAuthGroup || onSplashScreen)) {
      // Logged in, redirect to home or admin dashboard based on role
      const delay = onSplashScreen ? 2000 : 0;
      setTimeout(() => {
        if (user?.role === 'admin') {
          router.replace("/(admin)/(tabs)/dashboard" as any);
        } else {
          router.replace("/(tabs)/home");
        }
      }, delay);
    }
  }, [token, segments, isLoading, user]);

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
