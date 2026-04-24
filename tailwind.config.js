/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        fba: {
          DEFAULT: '#F59E0B',
          soft: '#FEF3C7',
          dark: '#B45309',
        },
        consulting: {
          DEFAULT: '#3B82F6',
          soft: '#DBEAFE',
          dark: '#1D4ED8',
        },
        koffee: {
          DEFAULT: '#8B5A2B',
          soft: '#F3E4D3',
          dark: '#5C3A1E',
        },
        ink: {
          50: '#F7F7F8',
          100: '#ECECEE',
          200: '#D4D4D8',
          700: '#2A2A2E',
          800: '#1C1C1F',
          900: '#141417',
          950: '#0B0B0D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
