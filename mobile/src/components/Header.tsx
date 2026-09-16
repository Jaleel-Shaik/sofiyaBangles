import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../constants/icons';
import { STRINGS } from '../constants/strings';

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
  titleClassName = 'text-headline-md font-bold text-text-primary'
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-row justify-between items-center px-5 pb-4 ${transparent ? '' : ''} ${className}`}
      style={{ paddingTop: Math.max(insets.top + 12, 36) }}
    >
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity
            className="w-11 h-11 bg-surface rounded-full items-center justify-center mr-3 border border-divider shadow-sm"
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.common.back}
          >
            <AppIcon name="back" size={22} color="#0f172a" />
          </TouchableOpacity>
        )}

        <View className="flex-1 justify-center">
          {subtitle && (
            <Text className="text-text-secondary font-medium text-body-sm mb-0.5">
              {subtitle}
            </Text>
          )}
          <Text className={titleClassName} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {rightElement && (
        <View className="ml-3 min-w-[44px] min-h-[44px] justify-center items-center">
          {rightElement}
        </View>
      )}
    </View>
  );
}
