import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'danger' | 'warning' | 'info';
  icon?: keyof typeof Ionicons.glyphMap;
  className?: string;
}

export default function Badge({ label, variant = 'success', icon, className = '' }: BadgeProps) {

  const variants = {
    success: 'bg-emerald-100 text-emerald-600',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-orange-100 text-orange-700',
    info: 'bg-blue-100 text-blue-700'
  };

  const textColors = {
    success: '#059669', // emerald-600
    danger: '#b91c1c',
    warning: '#c2410c',
    info: '#1d4ed8'
  };

  return (
    <View className={`flex-row items-center px-3 py-1 rounded-full ${variants[variant]} ${className}`}>
      {icon && <Ionicons name={icon as any} size={12} color={textColors[variant]} className="mr-1" />}
      <Text className={`text-xs font-bold`} style={{ color: textColors[variant] }}>
        {label}
      </Text>
    </View>
  );
}
