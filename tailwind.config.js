/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/app/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'beone-black': '#000000',
        'beone-dark': '#0D0D0D',
        'beone-gray': '#1A1A1A',
        'beone-orange': '#0b90f5', // The brand color
        'beone-text-muted': '#A1A1AA',
      },
    },
  },
  plugins: [],
}