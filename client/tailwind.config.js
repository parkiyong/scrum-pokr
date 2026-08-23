/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        display: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#10233f',
          soft: '#2f4565',
          muted: '#5d6f88',
        },
        brand: {
          accent: '#2047a8',
          strong: '#16347d',
          magenta: '#7f1d7a',
        },
        surface: {
          bgA: '#edf3fb',
          bgB: '#f9fbff',
          card: 'rgba(255, 255, 255, 0.95)',
          border: 'rgba(16, 35, 63, 0.12)',
        },
      },
    },
  },
  plugins: [],
}
