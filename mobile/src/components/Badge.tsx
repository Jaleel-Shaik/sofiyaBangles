import { View, Text } from 'react-native';
import { AppIcon } from '../constants/icons';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'danger' | 'warning' | 'info';
  icon?: string;
  className?: string;
}

export default function Badge({ label, variant = 'success', icon, className = '' }: BadgeProps) {

  const variants = {
    success: 'bg-emerald-50 border border-emerald-200',
    danger: 'bg-rose-50 border border-rose-200',
    warning: 'bg-amber-50 border border-amber-200',
    info: 'bg-sky-50 border border-sky-200',
  };

  const textColors = {
    success: '#047857', // emerald-700 for high contrast
    danger: '#be123c',  // rose-700
    warning: '#b45309', // amber-700
    info: '#0369a1',    // sky-700
  };

  return (
    <View className={`flex-row items-center px-2.5 py-1 rounded-full shadow-xs ${variants[variant]} ${className}`}>
      {icon && <AppIcon name={icon as any} size={14} color={textColors[variant]} style={{ marginRight: 4 }} />}
      <Text className="text-label-sm font-semibold tracking-wide" style={{ color: textColors[variant] }}>
        {label}
      </Text>
    </View>
  );
}
