/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#31703A',
          dark: '#245129',
          light: '#518D5A',
        },
        secondary: {
          DEFAULT: '#40AB40',
          dark: '#2D8C2D',
          light: '#66C166',
        },
        accent: {
          coral: '#DE5C35',
          'coral-dark': '#C4472A',
          'coral-light': '#E87F5D',
          yellow: '#F1BE49',
          'yellow-dark': '#D9A62E',
          mint: '#A8C685',
        },
        neutral: {
          50: '#FDFAF4',
          100: '#F8EDD9',
          200: '#F0E4CC',
          300: '#E0D4BC',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
        },
      },
      fontFamily: {
        sans: ['Merriweather', 'Georgia', 'serif'],
        display: ['"Pompadour Sample"', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        soft: '0 2px 10px rgba(0, 0, 0, 0.05)',
        medium: '0 4px 20px rgba(0, 0, 0, 0.08)',
        large: '0 10px 40px rgba(0, 0, 0, 0.1)',
        card: '0 2px 4px rgba(0, 0, 0, 0.1)',
        glow: '0 0 20px rgba(49, 112, 58, 0.15)',
      },
    },
  },
  plugins: [],
}
