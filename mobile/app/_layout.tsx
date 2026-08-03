import {
  Stack,
  router,
  useSegments,
  useRootNavigationState,
} from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/src/store/authStore";
import { getDashboardHref } from "@/src/utils/navigation";
import NetworkErrorModal from "@/src/components/NetworkErrorModal";
import "../global.css";

export default function RootLayout() {
  const { token, user } = useAuthStore();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

  // Redirect already-authenticated users away from the login screen
  useEffect(() => {
    if (!token || !user || !rootNavigationState?.key) return;

    if (user.role === "super_admin") {
      useAuthStore.getState().forceLogout();
      router.replace("/login");
      return;
    }

    const inLoginScreen = segments?.[0] === "login";

    if (inLoginScreen) {
      const href = getDashboardHref(user, token);
      router.replace(href);
    }
  }, [token, user, segments, rootNavigationState?.key]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="new-arrivals/index" />
        <Stack.Screen name="products/[id]" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="server-settings" />
        <Stack.Screen name="error-center" />
      </Stack>
      <NetworkErrorModal />
    </>
  );
}
