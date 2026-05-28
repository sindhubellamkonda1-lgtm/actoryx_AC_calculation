/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // This overrides Tailwind's default font with Inter
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}