/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"DM Sans"', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#0f172a',
          soft: '#334155',
          muted: '#64748b',
        },
        brand: {
          DEFAULT: '#2563eb',
          accent: '#3b82f6',
          strong: '#1d4ed8',
          light: '#e0f0fe',
          sky: '#dce8f5',
        },
        surface: {
          bgA: '#dce8f5',
          bgB: '#eaf2fa',
          card: '#ffffff',
          border: 'rgba(15, 23, 42, 0.08)',
        },
      },
    },
  },
  plugins: [],
}
