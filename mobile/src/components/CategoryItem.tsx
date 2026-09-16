import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { useRef } from 'react';
import { AppIcon, getCategoryIconFamily } from '../constants/icons';

interface CategoryItemProps {
  name: string;
  onPress: () => void;
  className?: string;
  size?: 'small' | 'large';
  subtitle?: string;
  imageUrl?: string;
}

const CATEGORY_COLORS: Record<string, { gradient: string[]; icon: string; accent: string }> = {
  bridal: { gradient: ['#FFE4E8', '#FFF0F3'], icon: '#FF1F4B', accent: '#FF1F4B' },
  gold: { gradient: ['#FFF8E1', '#FFFDE7'], icon: '#F5A623', accent: '#D4A026' },
  glass: { gradient: ['#E0F7FA', '#E0F2F1'], icon: '#0288D1', accent: '#00ACC1' },
  stone: { gradient: ['#F3E5F5', '#FCE4EC'], icon: '#9C27B0', accent: '#AB47BC' },
  metal: { gradient: ['#ECEFF1', '#F5F5F5'], icon: '#607D8B', accent: '#78909C' },
  kids: { gradient: ['#FFF3E0', '#FBE9E7'], icon: '#FF6F00', accent: '#E65100' },
  oxidised: { gradient: ['#E8F5E9', '#F1F8E9'], icon: '#2E7D32', accent: '#43A047' },
  default: { gradient: ['#FFF0F3', '#FFE4E6'], icon: '#e11d48', accent: '#FF1F4B' },
};

const getCategoryColors = (name?: string) => {
  const lower = (name || '').toLowerCase();
  for (const [key, colors] of Object.entries(CATEGORY_COLORS)) {
    if (lower.includes(key)) return colors;
  }
  return CATEGORY_COLORS.default;
};

const renderIcon = (n?: string, iconSize: number = 24, color: string = '#e11d48') => {
  const iconMeta = getCategoryIconFamily(n || '');
  return <AppIcon name={iconMeta.name as any} size={iconSize} color={color} family={iconMeta.family} />;
};


export default function CategoryItem({
  name,
  onPress,
  className = '',
  size = 'small',
  subtitle,
  imageUrl,
}: CategoryItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colors = getCategoryColors(name);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
      tension: 150,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 100,
    }).start();
  };

  if (size === 'large') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          className={`rounded-2xl overflow-hidden bg-surface border border-divider shadow-sm ${className}`}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={`Browse ${name} collection`}
        >
          <View className="w-full aspect-square bg-surface-secondary">
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full items-center justify-center bg-rose-50/50">
                {renderIcon(name, 44, colors.icon)}
              </View>
            )}
          </View>
          <View className="p-3.5">
            <Text className="font-bold text-text-primary text-title-sm text-center" numberOfLines={2}>
              {name}
            </Text>
            {subtitle && (
              <View className="flex-row items-center justify-center mt-1.5">
                <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.accent }} />
                <Text className="text-label-sm font-medium ml-1.5" style={{ color: colors.accent }}>
                  {subtitle}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={`Browse ${name} collection`}
        className={`items-center ${className}`}
      >
        <View className="w-24 h-24 rounded-2xl bg-rose-50/60 items-center justify-center border border-rose-100/70 overflow-hidden shadow-sm">
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            renderIcon(name, 32, colors.icon)
          )}
        </View>
        <Text className="text-label-md font-semibold text-text-primary mt-2 text-center" numberOfLines={1}>
          {name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
