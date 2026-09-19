import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';

/**
 * Standard Optical Sizing Scale for Icons
 * Consistent optical weight per UI/UX Design Constitution Rule 16
 */
export const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

export type IconSizeKey = keyof typeof ICON_SIZES;

/**
 * Centralized Icon Key Mapping
 */
export const ICONS = {
  // Navigation & Actions
  back: 'arrow-back',
  arrowForward: 'arrow-forward',
  search: 'search',
  searchOutline: 'search-outline',
  filter: 'options-outline',
  share: 'share-social-outline',
  close: 'close',
  check: 'checkmark',
  
  // E-commerce & Products
  bag: 'bag-handle-outline',
  bagFilled: 'bag',
  bagOutline: 'bag-outline',
  heart: 'heart',
  heartOutline: 'heart-outline',
  sparkles: 'sparkles',
  sparklesOutline: 'sparkles-outline',
  star: 'star',
  starOutline: 'star-outline',
  cubeOutline: 'cube-outline',
  
  // Navigation & Sections
  home: 'home',
  homeOutline: 'home-outline',
  grid: 'grid',
  gridOutline: 'grid-outline',
  appsOutline: 'apps-outline',
  profile: 'person',
  profileOutline: 'person-outline',
  personOutline: 'person-outline',
  notifications: 'notifications',
  notificationsOutline: 'notifications-outline',
  ruler: 'cut-outline',
  cutOutline: 'cut-outline',
  timeOutline: 'time-outline',
  
  // Quantity & Stepper
  add: 'add',
  remove: 'remove',
  
  // Status Badges
  checkCircle: 'checkmark-circle-outline',
  closeCircle: 'close-circle-outline',
  closeCircleFilled: 'close-circle',
  alertCircle: 'alert-circle-outline',
  infoCircle: 'information-circle-outline',
  
  // External & Chat
  whatsapp: 'logo-whatsapp',
  chatbubble: 'chatbubble',
  chatbubbleOutline: 'chatbubble-outline',
} as const;

export type IconNameKey = keyof typeof ICONS;

interface AppIconProps {
  name: IconNameKey | keyof typeof Ionicons.glyphMap;
  size?: IconSizeKey | number;
  color?: string;
  family?: 'ionicons' | 'fontawesome' | 'materialCommunity';
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

/**
 * Centralized AppIcon Primitive
 * Guarantees coherent icon style, optical sizes, and accessibility
 */
export function AppIcon({
  name,
  size = 'md',
  color = colors.text.primary,
  family = 'ionicons',
  style,
  accessibilityLabel,
}: AppIconProps) {
  const resolvedSize = typeof size === 'number' ? size : ICON_SIZES[size] || 20;
  const iconName = (ICONS[name as IconNameKey] || name) as any;

  if (family === 'fontawesome') {
    return (
      <FontAwesome
        name={iconName}
        size={resolvedSize}
        color={color}
        style={style}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  if (family === 'materialCommunity') {
    return (
      <MaterialCommunityIcons
        name={iconName}
        size={resolvedSize}
        color={color}
        style={style}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  return (
    <Ionicons
      name={iconName}
      size={resolvedSize}
      color={color}
      style={style}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

/**
 * Centralized Collection Category Icon Resolver
 */
export function getCategoryIconFamily(categoryName?: string): {
  family: 'ionicons' | 'materialCommunity';
  name: string;
} {
  const lower = (categoryName || '').toLowerCase();
  if (lower.includes('bridal')) return { family: 'materialCommunity', name: 'crown-outline' };
  if (lower.includes('glass')) return { family: 'materialCommunity', name: 'star-four-points-outline' };
  if (lower.includes('stone')) return { family: 'materialCommunity', name: 'diamond-outline' };
  if (lower.includes('metal')) return { family: 'materialCommunity', name: 'circle-outline' };
  if (lower.includes('kids')) return { family: 'materialCommunity', name: 'baby-face-outline' };
  if (lower.includes('oxidised')) return { family: 'materialCommunity', name: 'layers-outline' };
  if (lower.includes('gold') || lower.includes('silver')) return { family: 'ionicons', name: 'sparkles' };
  return { family: 'ionicons', name: 'apps-outline' };
}

