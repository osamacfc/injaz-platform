import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        amiri: ['Amiri', 'serif'],
      },
      colors: {
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8c87a',
          dark: '#a07830',
          pale: 'rgba(201,168,76,0.12)',
        },
        navy: {
          DEFAULT: '#0a0f1e',
          2: '#0d1526',
          3: '#111d35',
          4: '#162040',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'shimmer': 'shimmer 2s ease infinite',
        'float': 'floatUp 3s ease infinite',
        'seal-glow': 'sealGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatUp: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        sealGlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.6))' },
          '50%': { filter: 'drop-shadow(0 0 14px rgba(201,168,76,1))' },
        },
      },
      backdropBlur: { '4xl': '48px' },
    },
  },
  plugins: [],
}

export default config
