import {
  Stack,
  router,
  useSegments,
  useRootNavigationState,
} from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "@/src/store/authStore";
import { getDashboardHref } from "@/src/utils/navigation";
import NetworkErrorModal from "@/src/components/NetworkErrorModal";
import "../global.css";

/**
 * Branded loading splash shown while expo-router compiles
 * and navigates to the correct dashboard after login/OTP success.
 * Prevents the login screen from flashing during that transition.
 */
function NavigatingSplash() {
  return (
    <View style={styles.splash}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>✦</Text>
      </View>
      <Text style={styles.brand}>Sofiya Bangles</Text>
      <Text style={styles.subtitle}>Taking you to the dashboard...</Text>
      <ActivityIndicator color="#E8436E" size="large" style={{ marginTop: 24 }} />
    </View>
  );
}

export default function RootLayout() {
  const { token, user } = useAuthStore();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

  // isNavigating stays true from when we detect the user is authenticated
  // and on the login screen, until the router.replace() transition finishes.
  const [isNavigating, setIsNavigating] = useState(false);

  // Redirect already-authenticated users away from the login screen.
  useEffect(() => {
    if (!token || !user || !rootNavigationState?.key) return;

    // super_admin is not allowed on mobile — force logout immediately
    if (user.role === "super_admin") {
      useAuthStore.getState().forceLogout();
      router.replace("/login");
      return;
    }

    const inLoginScreen = segments?.[0] === "login";

    if (inLoginScreen) {
      // Show splash while routing to role-specific dashboard
      setIsNavigating(true);
      const href = getDashboardHref(user, token);
      router.replace(href);
    }
  }, [token, user, segments, rootNavigationState?.key]);

  // Reset isNavigating when we leave the login screen (navigation complete)
  useEffect(() => {
    if (isNavigating && segments?.[0] !== "login") {
      setIsNavigating(false);
    }
  }, [segments, isNavigating]);

  // Show branded splash while navigating to dashboard after login/OTP
  if (isNavigating) {
    return <NavigatingSplash />;
  }

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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8FA",
    paddingHorizontal: 32,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#E8436E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#E8436E",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
  },
  brand: {
    fontSize: 24,
    fontWeight: "700",
    color: "#171717",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#737373",
  },
});
