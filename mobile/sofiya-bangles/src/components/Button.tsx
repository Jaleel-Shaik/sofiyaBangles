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
  let bgClass = 'bg-rose-500';
  let textClass = 'text-white';
  let borderClass = '';
  
  switch (variant) {
    case 'primary':
      bgClass = 'bg-rose-500';
      textClass = 'text-white';
      break;
    case 'secondary':
      bgClass = 'bg-emerald-500';
      textClass = 'text-white';
      break;
    case 'outline':
      bgClass = 'bg-transparent';
      textClass = 'text-rose-600';
      borderClass = 'border border-rose-200';
      break;
    case 'danger':
      bgClass = 'bg-red-500';
      textClass = 'text-white';
      break;
  }

  // Size classes
  let pyClass = 'py-5';
  let textSizeClass = 'text-lg';
  
  switch (size) {
    case 'small':
      pyClass = 'py-3';
      textSizeClass = 'text-sm';
      break;
    case 'medium':
      pyClass = 'py-4';
      textSizeClass = 'text-base';
      break;
    case 'large':
      pyClass = 'py-5';
      textSizeClass = 'text-xl';
      break;
  }

  const isDisabled = loading || disabled;

  return (
    <TouchableOpacity
      className={`rounded-xl items-center justify-center flex-row shadow-sm ${bgClass} ${borderClass} ${pyClass} ${isDisabled ? 'opacity-70' : ''} ${className}`}
      disabled={isDisabled}
      activeOpacity={0.8}
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
