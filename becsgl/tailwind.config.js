/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#185FA5', light: '#E6F1FB', dark: '#0C447C' }
      }
    }
  },
  plugins: []
}
