import React from 'react';
import { Text, TextProps } from 'react-native';

export type TypographyVariant = 
  | 'display-xl' | 'display-lg' | 'display-md'
  | 'headline-xl' | 'headline-lg' | 'headline-md' | 'headline-sm'
  | 'title-lg' | 'title-md' | 'title-sm'
  | 'body-lg' | 'body-md' | 'body-sm'
  | 'label-lg' | 'label-md' | 'label-sm'
  | 'caption' | 'overline';

export type TypographyColor = 
  | 'primary' | 'secondary' | 'hint' 
  | 'brand-primary' | 'brand-secondary' | 'price'
  | 'success' | 'warning' | 'error' | 'white';

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: TypographyColor;
  className?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

export function Typography({
  variant = 'body-md',
  color = 'primary',
  className = '',
  weight,
  align = 'left',
  children,
  ...props
}: TypographyProps) {
  
  // Base classes mapping strictly to tailwind.config.js
  const variantClasses: Record<TypographyVariant, string> = {
    'display-xl': 'text-display-xl font-extrabold',
    'display-lg': 'text-display-lg font-extrabold',
    'display-md': 'text-display-md font-bold',
    
    'headline-xl': 'text-headline-xl font-bold',
    'headline-lg': 'text-headline-lg font-bold',
    'headline-md': 'text-headline-md font-bold',
    'headline-sm': 'text-headline-sm font-semibold',

    'title-lg': 'text-title-lg font-bold',
    'title-md': 'text-title-md font-semibold',
    'title-sm': 'text-title-sm font-semibold',

    'body-lg': 'text-body-lg',
    'body-md': 'text-body-md',
    'body-sm': 'text-body-sm',

    'label-lg': 'text-label-lg font-semibold',
    'label-md': 'text-label-md font-semibold',
    'label-sm': 'text-label-sm font-semibold',

    'caption': 'text-caption',
    'overline': 'text-overline font-bold uppercase tracking-wider',
  };

  const colorClasses: Record<TypographyColor, string> = {
    'primary': 'text-text-primary',
    'secondary': 'text-text-secondary',
    'hint': 'text-text-hint',
    'brand-primary': 'text-primary',
    'brand-secondary': 'text-secondary',
    'price': 'text-[#C25B3E]',
    'success': 'text-success',
    'warning': 'text-warning',
    'error': 'text-error',
    'white': 'text-white',
  };

  const weightClasses = {
    'normal': 'font-normal',
    'medium': 'font-medium',
    'semibold': 'font-semibold',
    'bold': 'font-bold',
    'extrabold': 'font-extrabold',
  };

  const alignClasses = {
    'left': 'text-left',
    'center': 'text-center',
    'right': 'text-right',
  };

  const combinedClasses = [
    variantClasses[variant],
    colorClasses[color],
    weight ? weightClasses[weight] : '',
    alignClasses[align],
    className
  ].filter(Boolean).join(' ');

  return (
    <Text className={combinedClasses} {...props}>
      {children}
    </Text>
  );
}
