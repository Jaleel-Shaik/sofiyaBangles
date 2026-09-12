import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { Typography, type TypographyColor } from './Typography';
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
  disabled?: boolean;
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
  disabled = false,
  className = '',
  ...props
}: ButtonProps) {
  
  // Base classes mapping to tailwind.config.js
  const baseClasses = 'flex-row items-center justify-center rounded-xl transition-colors';
  
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-primary border border-primary',
    secondary: 'bg-primary-50 border border-primary-100',
    outline: 'bg-transparent border border-primary-200',
    ghost: 'bg-transparent',
    danger: 'bg-error border border-error'
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'py-2 px-3',
    md: 'py-3.5 px-5',
    lg: 'py-4 px-6',
    icon: 'p-3'
  };

  const widthClasses = fullWidth ? 'w-full' : '';
  const disabledClasses = (disabled || loading) ? 'opacity-60' : '';

  const getTextColor = (): TypographyColor => {
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
              color={getTextColor()}
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
