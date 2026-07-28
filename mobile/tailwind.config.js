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
        // Semantic Typography
        'display-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        'display-md': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
        'display-sm': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em' }],
        
        'title-lg': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'title-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'title-sm': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body-md': ['14px', { lineHeight: '20px' }],
        'body-sm': ['12px', { lineHeight: '16px' }],
        
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '600', letterSpacing: '0.01em' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.01em' }],
        'label-sm': ['10px', { lineHeight: '14px', fontWeight: '600', letterSpacing: '0.02em', textTransform: 'uppercase' }],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      }
    },
  },
  plugins: [],
}