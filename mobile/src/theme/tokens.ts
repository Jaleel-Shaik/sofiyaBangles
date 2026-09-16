/**
 * Universal UI/UX Design System & Typography Tokens
 * Sofiya Bangles Mobile Customer App
 * Strict adherence to the Frontend Design Constitution
 */

export const colors = {
  // Brand Identity
  brand: {
    primary: '#e11d48', // Standardized Rose
    primaryLight: '#FFF0F3',
    primaryDark: '#be123c',
    secondary: '#6366f1', // Indigo Accent
    secondaryLight: '#e0e7ff',
    accent: '#D4AF37', // Gold Accent
  },
  // Surfaces & Backgrounds
  surface: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    muted: '#F1F5F9',
    overlay: 'rgba(0, 0, 0, 0.45)',
  },
  // Content & Typography
  text: {
    primary: '#0f172a', // Slate 900 (High contrast)
    secondary: '#64748b', // Slate 500 (Medium contrast)
    muted: '#94a3b8', // Slate 400 (Low contrast/placeholders)
    inverse: '#FFFFFF',
    brand: '#e11d48',
    price: '#C25B3E', // Terracotta warm gold/red for price
  },
  // Borders & Dividers
  border: {
    default: '#f1f5f9',
    subtle: '#e2e8f0',
    strong: '#cbd5e1',
    brand: '#fecdd3',
  },
  // Semantic Status
  status: {
    success: '#10b981',
    successLight: '#ecfdf5',
    warning: '#f59e0b',
    warningLight: '#fffbeb',
    error: '#ef4444',
    errorLight: '#fef2f2',
    info: '#3b82f6',
    infoLight: '#eff6ff',
  },
} as const;

export const typography = {
  // Display
  displayXl: { fontSize: 48, lineHeight: 56, fontWeight: '800' as const, letterSpacing: -0.8 },
  displayLg: { fontSize: 40, lineHeight: 48, fontWeight: '800' as const, letterSpacing: -0.6 },
  displayMd: { fontSize: 36, lineHeight: 44, fontWeight: '700' as const, letterSpacing: -0.5 },

  // Headline
  headlineXl: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.3 },
  headlineLg: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -0.2 },
  headlineMd: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.2 },
  headlineSm: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const, letterSpacing: 0 },

  // Title
  titleLg: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const },
  titleMd: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  titleSm: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },

  // Body
  bodyLg: { fontSize: 18, lineHeight: 28, fontWeight: '400' as const },
  bodyMd: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },

  // Label
  labelLg: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const, letterSpacing: 0.1 },
  labelMd: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const, letterSpacing: 0.1 },
  labelSm: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.1 },

  // Caption & Overline
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  overline: { fontSize: 10, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  11: 44, // 44px minimum touch target
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

/**
 * Touch Target Ergonomics:
 * Minimum hit area standard (WCAG 2.2 / Mobile Ergonomics)
 */
export const touchTargets = {
  minWidth: 44,
  minHeight: 44,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
  largeHitSlop: { top: 14, bottom: 14, left: 14, right: 14 },
} as const;
