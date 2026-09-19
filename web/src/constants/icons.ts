/**
 * Standard Optical Sizing Scale & Keys for Web Icons
 * Adheres to UI/UX Design Constitution Rule 16
 */

export const ICON_SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
} as const;

export type IconSizeKey = keyof typeof ICON_SIZES;

export const ICONS = {
  // Navigation
  dashboard: 'LayoutDashboard',
  products: 'Package',
  orders: 'ShoppingBag',
  categories: 'Layers',
  modelTypes: 'Layers',
  activity: 'ClipboardList',
  revenue: 'TrendingUp',
  admins: 'UserCheck',
  forms: 'FileText',
  settings: 'Settings',
  profile: 'User',
  security: 'Shield',
  logout: 'LogOut',
  menu: 'Menu',
  close: 'X',
  bell: 'Bell',
  
  // Actions & Controls
  add: 'Plus',
  addCircle: 'PlusCircle',
  edit: 'Edit',
  delete: 'Trash2',
  search: 'Search',
  filter: 'Filter',
  zap: 'Zap',
  check: 'Check',
  checkCheck: 'CheckCheck',
  chevronDown: 'ChevronDown',
  chevronRight: 'ChevronRight',
  alert: 'AlertTriangle',
  loader: 'Loader2',
  folder: 'FolderOpen',
  info: 'Info',
} as const;

export type IconNameKey = keyof typeof ICONS;
