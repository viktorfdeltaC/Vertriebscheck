/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wert: {
          navy: '#1B2A4A',
          blue: '#2563EB',
          bg: '#F8F9FB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(37, 99, 235, 0.45)' },
          '50%': { boxShadow: '0 0 0 8px rgba(37, 99, 235, 0)' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
