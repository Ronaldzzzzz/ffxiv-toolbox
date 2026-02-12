/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'exp-2': '#666666',
        'exp-3': '#4C7EE8',
        'exp-4': '#A22A3E',
        'exp-5': '#2E1D4A',
        'exp-6': '#3D4E99',
        'exp-7': '#9B853F',
      }
    },
  },
  plugins: [],
}
