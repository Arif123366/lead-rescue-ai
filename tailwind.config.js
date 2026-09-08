/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          neon: '#00f0ff',
        },
        rescue: {
          50: '#faf5ff',
          100: '#f3e8ff',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          neon: '#d946ef',
        },
        xilxil: {
          cyan: '#00f0ff',
          sky: '#00a8ff',
          purple: '#a855f7',
          violet: '#8b5cf6',
          magenta: '#d946ef',
          dark: '#030712'
        }
      },
    },
  },
  plugins: [],
};
