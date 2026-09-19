import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import { ReactNode } from 'react';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export default function Button({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  
  // Base classes
  let bgClass = 'bg-primary';
  let textClass = 'text-white';
  let borderClass = '';
  
  switch (variant) {
    case 'primary':
      bgClass = 'bg-primary';
      textClass = 'text-white';
      break;
    case 'secondary':
      bgClass = 'bg-emerald-600';
      textClass = 'text-white';
      break;
    case 'outline':
      bgClass = 'bg-transparent';
      textClass = 'text-primary';
      borderClass = 'border border-rose-300';
      break;
    case 'danger':
      bgClass = 'bg-rose-600';
      textClass = 'text-white';
      break;
  }

  // Size classes with touch target ergonomics
  let sizeClass = 'min-h-[48px] py-3.5 px-5';
  let textSizeClass = 'text-label-lg';
  
  switch (size) {
    case 'small':
      sizeClass = 'min-h-[44px] py-2.5 px-4';
      textSizeClass = 'text-label-md';
      break;
    case 'medium':
      sizeClass = 'min-h-[48px] py-3.5 px-5';
      textSizeClass = 'text-label-lg';
      break;
    case 'large':
      sizeClass = 'min-h-[52px] py-4 px-6';
      textSizeClass = 'text-title-sm';
      break;
  }

  const isDisabled = loading || disabled;

  return (
    <TouchableOpacity
      className={`rounded-2xl items-center justify-center flex-row shadow-sm ${bgClass} ${borderClass} ${sizeClass} ${isDisabled ? 'opacity-60' : ''} ${className}`}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={title}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#e11d48' : '#ffffff'} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <View className="mr-2">{icon}</View>}
          <Text className={`${textClass} ${textSizeClass} font-bold`}>{title}</Text>
          {icon && iconPosition === 'right' && <View className="ml-2">{icon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}
