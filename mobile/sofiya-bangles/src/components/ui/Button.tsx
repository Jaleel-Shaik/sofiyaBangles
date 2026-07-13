import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator, View } from 'react-native';
import { Typography } from './Typography';
import { Ionicons } from '@expo/vector-icons';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  title,
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  
  const baseClasses = 'flex-row items-center justify-center rounded-full';
  
  const variantClasses = {
    primary: 'bg-primary shadow-sm',
    secondary: 'bg-primary-light',
    outline: 'bg-transparent border border-primary',
    ghost: 'bg-transparent',
    danger: 'bg-error-light border border-error-light',
  };

  const sizeClasses = {
    sm: 'py-2 px-4',
    md: 'py-3.5 px-6',
    lg: 'py-4 px-8',
    icon: 'p-3 w-12 h-12', // For circular icon buttons
  };

  const widthClasses = fullWidth ? 'w-full' : '';
  const disabledClasses = (disabled || loading) ? 'opacity-60' : '';

  const getTextColor = () => {
    if (variant === 'primary') return 'white';
    if (variant === 'danger') return 'error';
    return 'brand-primary';
  };

  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    widthClasses,
    disabledClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <TouchableOpacity 
      className={combinedClasses} 
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#e11d48'} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons 
              name={icon} 
              size={size === 'sm' ? 16 : 20} 
              color={variant === 'primary' ? 'white' : '#e11d48'} 
              style={{ marginRight: title ? 8 : 0 }} 
            />
          )}
          
          {title && (
            <Typography 
              variant="label-lg" 
              color={getTextColor() as any}
              weight="bold"
            >
              {title}
            </Typography>
          )}

          {icon && iconPosition === 'right' && (
            <Ionicons 
              name={icon} 
              size={size === 'sm' ? 16 : 20} 
              color={variant === 'primary' ? 'white' : '#e11d48'} 
              style={{ marginLeft: title ? 8 : 0 }} 
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
