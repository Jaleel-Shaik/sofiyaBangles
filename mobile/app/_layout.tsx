import {
  Stack,
  router,
  useSegments,
  useRootNavigationState,
} from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, StyleSheet, Image } from "react-native";
import { useAuthStore } from "@/src/store/authStore";
import { getDashboardHref } from "@/src/utils/navigation";
import { startAppStateListener, stopAppStateListener } from "@/src/api/client";
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
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
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

  // Active AppState listener to automatically refresh tokens upon app foregrounding
  useEffect(() => {
    startAppStateListener();
    return () => {
      stopAppStateListener();
    };
  }, []);

  // isNavigating stays true from when we detect the user is authenticated
  // and on the login screen, until the router.replace() transition finishes.
  const [isNavigating, setIsNavigating] = useState(false);

  // Redirect already-authenticated users away from the login screen.
  useEffect(() => {
    if (!token || !user || !rootNavigationState?.key) return;

    // super_admin is not allowed on mobile — force logout immediately
    if (user.role === "super_admin") {
      useAuthStore.getState().forceLogout();
      if (segments?.[0] !== "login") {
        router.replace("/login");
      }
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

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="new-arrivals/index" />
        <Stack.Screen name="products/[id]" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="search" />
        <Stack.Screen name="orders" />
        <Stack.Screen name="server-settings" />
        <Stack.Screen name="error-center" />
      </Stack>
      {isNavigating && (
        <View style={StyleSheet.absoluteFill}>
          <NavigatingSplash />
        </View>
      )}
      <NetworkErrorModal />
    </View>
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
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFE4E6",
    shadowColor: "#E8436E",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoImage: {
    width: "100%",
    height: "100%",
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
