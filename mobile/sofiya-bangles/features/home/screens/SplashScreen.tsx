import { View, Text, Image, Animated, StatusBar } from "react-native";
import { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/src/store/authStore";
import { useSizeStore } from "@/src/store/sizeStore";

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoading, token, user } = useAuthStore();
  const { fetchPreferences } = useSizeStore();
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [ready, setReady] = useState(false);

  // Restore auth token and wait for it
  useEffect(() => {
    useAuthStore.getState().restoreToken();
  }, []);

  // Start loading bar animation once auth is ready
  useEffect(() => {
    if (!isLoading) {
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 1800,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          setReady(true);
        }
      });
    }
  }, [isLoading]);

  // Fade out and navigate when ready
  useEffect(() => {
    if (!ready) return;
    
    // Fetch size preferences if logged in (fire and forget)
    if (token && user) {
      fetchPreferences();
    }
    
    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Navigate after fade out
      if (!token) {
        router.replace("/(auth)/login");
      } else if (user?.role === 'admin' || user?.role === 'super_admin') {
        router.replace("/(admin)/(tabs)/dashboard");
      } else {
        router.replace("/(tabs)/home");
      }
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
              <View className="w-full h-full rounded-full border-4 border-rose-300 overflow-hidden relative">
                <Image
                  source={{ uri: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca5" }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              <View className="absolute -top-1 -right-1 bg-white rounded-full p-2 border border-rose-200 shadow-sm">
                <Ionicons name="sparkles" size={14} color="#e11d48" />
              </View>
            </View>

            <Text className="text-4xl font-extrabold text-rose-600 mb-2 font-serif tracking-wide">
              Sofiya Bangles
            </Text>
            <Text className="text-sm text-rose-400 font-medium mb-8 text-center px-4 leading-5">
              Discover Elegance, Wear Beauty
            </Text>

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
