/**
 * Sofiya Bangles Web Admin Portal - Unified Design Tokens
 * Adheres to UI/UX Design Constitution & Typography System
 * Single Source of Truth for Visual Design Decision
 */

export const typography = {
  fontFamily: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "'Playfair Display', Georgia, serif",
    mono: "'Fira Code', 'Courier New', monospace",
  },
  
  // Standard Type Ramp per UI/UX Design Constitution Rule 7
  scale: {
    'display-xl': { fontSize: '3rem', lineHeight: '3.5rem', letterSpacing: '-0.025em', fontWeight: '800' },     // 48/56
    'display-lg': { fontSize: '2.5rem', lineHeight: '3rem', letterSpacing: '-0.025em', fontWeight: '800' },     // 40/48
    'display-md': { fontSize: '2.25rem', lineHeight: '2.75rem', letterSpacing: '-0.02em', fontWeight: '700' },  // 36/44
    
    'headline-xl': { fontSize: '2rem', lineHeight: '2.5rem', letterSpacing: '-0.02em', fontWeight: '700' },     // 32/40
    'headline-lg': { fontSize: '1.75rem', lineHeight: '2.25rem', letterSpacing: '-0.015em', fontWeight: '700' }, // 28/36
    'headline-md': { fontSize: '1.5rem', lineHeight: '2rem', letterSpacing: '-0.015em', fontWeight: '700' },    // 24/32
    'headline-sm': { fontSize: '1.375rem', lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '600' }, // 22/28
    
    'title-lg': { fontSize: '1.25rem', lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '600' },     // 20/28
    'title-md': { fontSize: '1.125rem', lineHeight: '1.5rem', letterSpacing: '-0.005em', fontWeight: '600' },    // 18/24
    'title-sm': { fontSize: '1rem', lineHeight: '1.375rem', letterSpacing: '0em', fontWeight: '600' },           // 16/22
    
    'body-lg': { fontSize: '1.125rem', lineHeight: '1.75rem', letterSpacing: '0em', fontWeight: '400' },         // 18/28
    'body-md': { fontSize: '1rem', lineHeight: '1.5rem', letterSpacing: '0em', fontWeight: '400' },              // 16/24
    'body-sm': { fontSize: '0.875rem', lineHeight: '1.25rem', letterSpacing: '0em', fontWeight: '400' },         // 14/20
    
    'label-lg': { fontSize: '0.875rem', lineHeight: '1.25rem', letterSpacing: '0.01em', fontWeight: '600' },     // 14/20
    'label-md': { fontSize: '0.8125rem', lineHeight: '1.125rem', letterSpacing: '0.01em', fontWeight: '600' },  // 13/18
    'label-sm': { fontSize: '0.75rem', lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '600' },        // 12/16
    
    'caption': { fontSize: '0.75rem', lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '400' },         // 12/16
    'overline': { fontSize: '0.6875rem', lineHeight: '0.875rem', letterSpacing: '0.06em', fontWeight: '700', textTransform: 'uppercase' }, // 11/14
  },
} as const;

export const colors = {
  // Brand / Primary: Sofiya Rose Palette
  primary: {
    50: '#FFF0F3',
    100: '#FFD6DE',
    200: '#FFB3C2',
    300: '#FF8099',
    400: '#FF4D70',
    500: '#E8436E',
    600: '#CC3366',
    700: '#B3245A',
    800: '#991A4D',
    900: '#7A0D3C',
  },
  
  // Secondary: Cobalt & Sapphire Accents
  secondary: {
    50: '#F0F7FF',
    100: '#DBECFF',
    200: '#B8D6FF',
    300: '#85B8FF',
    400: '#4D94FF',
    500: '#2563EB',
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#172554',
  },

  // Surface & Neutral Scale
  surface: {
    background: '#FAFAFA',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    subtle: '#F8FAFC',
    muted: '#F1F5F9',
    hover: '#F1F5F9',
  },

  // Semantic Status
  status: {
    success: {
      bg: '#ECFDF5',
      text: '#047857',
      border: '#A7F3D0',
      dot: '#10B981',
    },
    warning: {
      bg: '#FFFBEB',
      text: '#B45309',
      border: '#FDE68A',
      dot: '#F59E0B',
    },
    danger: {
      bg: '#FEF2F2',
      text: '#B91C1C',
      border: '#FECACA',
      dot: '#EF4444',
    },
    info: {
      bg: '#EFF6FF',
      text: '#1D4ED8',
      border: '#BFDBFE',
      dot: '#3B82F6',
    },
    neutral: {
      bg: '#F8FAFC',
      text: '#475569',
      border: '#E2E8F0',
      dot: '#94A3B8',
    },
  },

  // Content Text
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#64748B',
    hint: '#94A3B8',
    inverted: '#FFFFFF',
  },

  // Borders & Dividers
  border: {
    subtle: '#F1F5F9',
    default: '#E2E8F0',
    strong: '#CBD5E1',
    focus: '#E8436E',
  },
} as const;

export const spacing = {
  0: '0px',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  7: '1.75rem',  // 28px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
} as const;

export const radius = {
  none: '0px',
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

export const shadows = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
  glow: '0 0 15px rgba(232, 67, 110, 0.25)',
} as const;

export const touchTarget = {
  minWidth: '44px',
  minHeight: '44px',
} as const;
