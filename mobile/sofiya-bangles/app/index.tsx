import { View, Text, Image, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function SplashScreen() {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View className="flex-1">
      <LinearGradient
        colors={["#fbcfe8", "#fce7f3", "#fdf2f8"]}
        className="flex-1 items-center justify-center pt-20"
      >
        {/* Logo Circular Image */}
        <View className="w-56 h-56 rounded-full bg-white/50 items-center justify-center p-2 mb-8 shadow-sm">
          <View className="w-full h-full rounded-full border-4 border-amber-400 overflow-hidden relative">
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca5" }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          <View className="absolute top-2 right-2 bg-white rounded-full p-2 border border-amber-200">
            <Ionicons name="sparkles" size={16} color="#d97706" />
          </View>
        </View>

        {/* Title */}
        <Text className="text-5xl font-extrabold text-rose-600 mb-2 font-serif">
          Bangle Shop
        </Text>
        <Text className="text-base text-rose-400 italic mb-6">
          Discover Elegance, Wear Beauty
        </Text>

        {/* Divider */}
        <View className="flex-row items-center gap-3 mb-20">
          <View className="w-10 h-[1px] bg-rose-200" />
          <Ionicons name="diamond" size={14} color="#e11d48" />
          <View className="w-10 h-[1px] bg-rose-200" />
        </View>

        {/* Loading Bar section */}
        <View className="absolute bottom-16 w-full items-center px-12">
          <View className="w-full h-1.5 bg-white rounded-full overflow-hidden mb-2">
            <Animated.View
              className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full"
              style={{ width: progressWidth, backgroundColor: '#e11d48' }}
            />
          </View>
          <Text className="text-xs text-rose-400 mb-6">
            Loading your collection...
          </Text>
          <Text className="text-[10px] text-rose-300 uppercase tracking-widest">
            Powered by Sofiya Bangles Platform
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
