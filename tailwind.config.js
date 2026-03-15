/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-haas)', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        yellow: {
          400: '#FFD600',
          500: '#F5C800',
        },
        navy: '#0D0D0D',
        muted: '#6B6B6B',
      },
    },
  },
  plugins: [],
}
