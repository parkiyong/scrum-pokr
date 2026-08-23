/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#0f172a',
          strong: '#020617',
          soft: '#334155',
          muted: '#64748b',
          faint: '#94a3b8',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          DEFAULT: '#2563eb',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
          accent: '#2563eb',
          strong: '#1d4ed8',
          magenta: '#7c3aed',
        },
        surface: {
          DEFAULT: '#ffffff',
          subdued: '#f8fafc',
          card: 'rgba(255, 255, 255, 0.96)',
          border: 'rgba(15, 23, 42, 0.08)',
          borderStrong: 'rgba(15, 23, 42, 0.16)',
          bgA: '#f1f5f9',
          bgB: '#f8fafc',
        },
        felt: {
          canvas: '#f8fafc',
          rail: '#e2e8f0',
          felt: '#ffffff',
          border: '#cbd5e1',
          accent: '#2563eb',
        },
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        'elevated': '0 12px 36px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)',
        'glow': '0 0 25px -3px rgba(37, 99, 235, 0.25)',
        'glow-emerald': '0 0 25px -3px rgba(16, 185, 129, 0.25)',
        'glow-rose': '0 0 25px -3px rgba(244, 63, 94, 0.25)',
        'card-lift': '0 20px 40px -15px rgba(15, 23, 42, 0.15)',
        'modal': '0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 1px 1px rgba(15, 23, 42, 0.05)',
      },
      keyframes: {
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(-4%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
          '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'bounce-slow': 'bounce-slow 3s infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}

