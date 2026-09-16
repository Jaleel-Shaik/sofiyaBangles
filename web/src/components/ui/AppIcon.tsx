"use client";

import React from 'react';
import * as LucideIcons from 'lucide-react';
import { ICON_SIZES, type IconSizeKey, type IconNameKey, ICONS } from '@/src/constants/icons';

interface AppIconProps {
  name: IconNameKey | keyof typeof LucideIcons;
  size?: IconSizeKey | number;
  className?: string;
  strokeWidth?: number;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}

export function AppIcon({
  name,
  size = 'md',
  className = '',
  strokeWidth = 2,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
}: AppIconProps) {
  const resolvedSize = typeof size === 'number' ? size : ICON_SIZES[size] || 20;
  
  // Resolve component from LucideIcons
  const iconKey = (ICONS[name as IconNameKey] || name) as keyof typeof LucideIcons;
  const Component = (LucideIcons[iconKey] as React.ComponentType<{
    size?: number;
    className?: string;
    strokeWidth?: number;
    'aria-label'?: string;
    'aria-hidden'?: boolean;
  }>) || LucideIcons.HelpCircle;

  return (
    <Component
      size={resolvedSize}
      strokeWidth={strokeWidth}
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden ?? !ariaLabel}
    />
  );
}

export default AppIcon;
