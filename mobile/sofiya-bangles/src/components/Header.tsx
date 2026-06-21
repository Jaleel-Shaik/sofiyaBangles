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
  titleClassName = 'text-3xl font-extrabold text-slate-900 font-serif'
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View 
      className={`flex-row justify-between items-center px-6 pb-5 ${transparent ? '' : 'bg-rose-50'} ${className}`}
      style={{ paddingTop: Math.max(insets.top + 16, 40) }}
    >
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity 
            className="w-12 h-12 bg-white/80 rounded-full items-center justify-center shadow-sm mr-4"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={28} color="#1e293b" />
          </TouchableOpacity>
        )}
        
        <View className="flex-1">
          {subtitle && <Text className="text-rose-500 font-bold text-base mb-1">{subtitle}</Text>}
          <Text className={`${titleClassName}`} numberOfLines={1}>
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
