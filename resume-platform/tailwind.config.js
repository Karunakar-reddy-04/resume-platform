/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1A56A0', light: '#2563eb', dark: '#1e3a6e' },
      }
    }
  },
  plugins: []
}
