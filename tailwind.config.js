/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
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