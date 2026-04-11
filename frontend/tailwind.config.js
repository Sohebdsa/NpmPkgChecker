/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        safe:      '#10b981',
        warning:   '#f59e0b',
        malicious: '#ef4444',
        brand:     '#6366f1',
        bgDark:    '#080c14',
        surface:   '#0f172a',
        cardDark:  '#111827',
        border:    'rgba(255,255,255,0.07)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-brand': '0 0 40px rgba(99,102,241,0.15)',
        'glow-safe':  '0 0 20px rgba(16,185,129,0.2)',
      },
      animation: {
        'spin-slow':  'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}
