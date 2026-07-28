import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  children: React.ReactNode;
}

export function Card({
  variant = 'elevated',
  padding = 'md',
  radius = '3xl',
  className = '',
  children,
  ...props
}: CardProps) {
  
  const baseClasses = 'bg-card overflow-hidden';
  
  const variantClasses = {
    elevated: 'shadow-sm border border-slate-50', // Subtle shadow and border for depth
    outlined: 'border border-slate-200',
    flat: 'bg-background', // Blends with background
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const radiusClasses = {
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl', // Equivalent to standard nativewind rounded-3xl
    '2xl': 'rounded-[24px]',
    '3xl': 'rounded-[32px]',
  };

  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    radiusClasses[radius],
    className
  ].filter(Boolean).join(' ');

  return (
    <View className={combinedClasses} {...props}>
      {children}
    </View>
  );
}
