/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: { 950: '#03060f', 900: '#060b1a', 850: '#0a1124', 800: '#0e1730', 700: '#15213f' },
        flame: { 300: '#ffc27a', 400: '#ff9f43', 500: '#ff7a1a', 600: '#e85d04' },
        micro: { 300: '#9fd3ff', 400: '#5cb8ff', 500: '#2f8cff', 600: '#1f6fe0' },
      },
      fontFamily: {
        sans: ['Rajdhani', 'Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"Share Tech Mono"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: { glow: '0 0 40px -10px rgba(255,122,26,0.45)', glowBlue: '0 0 40px -10px rgba(47,140,255,0.5)' },
    },
  },
  plugins: [],
};
