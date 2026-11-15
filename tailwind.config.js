/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: { 950: '#07050a', 900: '#0c0a12', 850: '#12101a', 800: '#181522', 700: '#221e30' },
        flame: { 300: '#ffc27a', 400: '#ff9f43', 500: '#ff7a1a', 600: '#e85d04' },
        micro: { 300: '#9fd3ff', 400: '#5cb8ff', 500: '#2f8cff', 600: '#1f6fe0' },
        ember: { 400: '#ff8a3d', 500: '#ff5c1a', 600: '#c43a00' },
        ink: { 900: '#0a0810', 950: '#05040a' },
      },
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['Syne', 'Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 48px -12px rgba(255,92,26,0.55)',
        glowBlue: '0 0 48px -12px rgba(47,140,255,0.45)',
        soft: '0 24px 64px -28px rgba(0,0,0,0.65)',
      },
      keyframes: {
        'ember-pulse': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.04)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'ember-pulse': 'ember-pulse 4.5s ease-in-out infinite',
        'float-slow': 'float-slow 5s ease-in-out infinite',
        shimmer: 'shimmer 8s linear infinite',
      },
    },
  },
  plugins: [],
};
