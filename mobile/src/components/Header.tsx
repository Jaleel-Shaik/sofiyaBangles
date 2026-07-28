import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  transparent?: boolean;
  className?: string;
  titleClassName?: string;
}

export default function Header({
  title,
  subtitle,
  showBack = false,
  rightElement,
  transparent = false,
  className = '',
  titleClassName = 'text-2xl font-bold text-text-primary'
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-row justify-between items-center px-5 pb-5 ${transparent ? '' : ''} ${className}`}
      style={{ paddingTop: Math.max(insets.top + 16, 40) }}
    >
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity
            className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-3 border border-divider"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
        )}

        <View className="flex-1">
          {subtitle && <Text className="text-text-secondary font-medium text-sm mb-0.5">{subtitle}</Text>}
          <Text className={titleClassName} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {rightElement && (
        <View className="ml-4">
          {rightElement}
        </View>
      )}
    </View>
  );
}
