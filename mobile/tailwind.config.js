/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand Identity
        primary: {
          DEFAULT: '#e11d48', // Standardized rose primary
          light: '#FFF0F3',
          dark: '#be123c',
        },
        secondary: {
          DEFAULT: '#6366f1', // Indigo accent
          light: '#e0e7ff',
        },
        accent: {
          DEFAULT: '#D4AF37', // Gold accent
        },
        // Surface & Backgrounds
        background: '#F8FAFC', // Slate 50/100ish for main bg
        surface: '#FFFFFF',
        card: '#FFFFFF',
        
        // Semantics
        success: {
          DEFAULT: '#10b981',
          light: '#ecfdf5',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fffbeb',
        },
        error: {
          DEFAULT: '#ef4444',
          light: '#fef2f2',
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#eff6ff',
        },

        // Text & Icons
        text: {
          primary: '#0f172a', // Slate 900
          secondary: '#64748b', // Slate 500
          hint: '#94a3b8', // Slate 400
        },
        divider: '#f1f5f9', // Slate 100
      },
      fontSize: {
        // Design Constitution Semantic Typography Ramp
        'display-xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-md': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
        
        'headline-xl': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-sm': ['22px', { lineHeight: '28px', letterSpacing: '0em', fontWeight: '600' }],

        'title-lg': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'title-md': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'title-sm': ['16px', { lineHeight: '22px', fontWeight: '600' }],

        'body-lg': ['18px', { lineHeight: '28px' }],
        'body-md': ['16px', { lineHeight: '24px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],

        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '600', letterSpacing: '0.01em' }],
        'label-md': ['13px', { lineHeight: '18px', fontWeight: '600', letterSpacing: '0.01em' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.01em' }],

        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'overline': ['10px', { lineHeight: '14px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }],
      },
      spacing: {
        '0': '0px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '10': '40px',
        '11': '44px', // Standard 44px touch target size
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px',
      }
    },
  },
  plugins: [],
}