import { View, Text, Image, Animated, StatusBar } from "react-native";
import { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/src/store/authStore";
import { getDashboardHref } from "@/src/utils/navigation";
import { initApiClientConfig } from "@/src/api/config";

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoading, token, user } = useAuthStore();
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [initDone, setInitDone] = useState(false);
  const [ready, setReady] = useState(false);

  // Initialize API base URL configuration and restore auth session in parallel
  useEffect(() => {
    let mounted = true;
    const initializeApp = async () => {
      try {
        await Promise.allSettled([
          initApiClientConfig(),
          useAuthStore.getState().restoreToken(),
        ]);
      } catch (err) {
        console.warn("App initialization warning:", err);
      } finally {
        if (mounted) {
          setInitDone(true);
        }
      }
    };

    initializeApp();
    return () => {
      mounted = false;
    };
  }, []);

  // Start loading bar animation once initialization is complete and auth is resolved
  useEffect(() => {
    if (initDone && !isLoading) {
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 1500,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          setReady(true);
        }
      });
    }
  }, [initDone, isLoading]);

  // Fade out and navigate when ready
  useEffect(() => {
    if (!ready) return;
    
    
    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // super_admin stays on /login — LoginScreen shows the restriction modal
      const href = getDashboardHref(user, token);
      router.replace(href);
    });
  }, [ready]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View className="flex-1">
      <StatusBar barStyle="dark-content" backgroundColor="#fbcfe8" />
      <Animated.View className="flex-1" style={{ opacity: fadeAnim }}>
        <LinearGradient
          colors={["#fbcfe8", "#fce7f3", "#fff"]}
          className="flex-1 items-center"
          style={{ paddingTop: insets.top }}
        >
          {/* Logo + Content */}
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-48 h-48 rounded-full bg-white/60 items-center justify-center p-2 mb-6"
              style={{
                shadowColor: '#e11d48',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              <View className="w-full h-full rounded-full bg-white border-4 border-rose-200 overflow-hidden p-3 items-center justify-center relative">
                <Image
                  source={require("../../../assets/images/logo.png")}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              </View>
              <View className="absolute -top-1 -right-1 bg-white rounded-full p-2 border border-rose-200 shadow-sm">
                <Ionicons name="sparkles" size={14} color="#e11d48" />
              </View>
            </View>

            <Text className="text-4xl font-extrabold text-rose-600 mb-3 font-serif tracking-wide text-center">
              Sofiya Bangles
            </Text>
            <View className="flex-row items-center bg-white/85 px-4 py-1.5 rounded-full border border-rose-200/90 shadow-sm mb-8">
              <Ionicons name="sparkles" size={13} color="#e11d48" style={{ marginRight: 6 }} />
              <Text className="text-xs font-bold text-rose-600 tracking-wider text-center uppercase">
                Find best suited things for you
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="w-12 h-px bg-rose-200" />
              <View className="mx-3 w-6 h-6 rounded-full bg-rose-100 items-center justify-center">
                <Ionicons name="diamond" size={12} color="#e11d48" />
              </View>
              <View className="w-12 h-px bg-rose-200" />
            </View>
          </View>

          {/* Loading Bar */}
          <View className="w-full items-center px-10" style={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}>
            <View className="w-full h-1 bg-rose-200/60 rounded-full overflow-hidden mb-3">
              <Animated.View
                className="h-full rounded-full"
                style={{
                  width: progressWidth,
                  backgroundColor: '#e11d48',
                }}
              />
            </View>
            <Text className="text-xs text-rose-400 font-medium">
              {isLoading ? 'Restoring session...' : 'Loading your collection...'}
            </Text>
            <Text className="text-[10px] text-rose-300 uppercase tracking-[2px] mt-2 font-medium">
              Powered by Sofiya Bangles Platform
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}
