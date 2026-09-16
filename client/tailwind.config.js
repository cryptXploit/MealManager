/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // important for dark mode toggle
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%) skewX(-12deg)' }
        }
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite'
      }
    },
  },
  plugins: [],
}