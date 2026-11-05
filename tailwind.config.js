/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B1120',
          navy: '#10192D',
          card: '#16223B',
          border: '#233354',
          orange: '#FF4612',      // From "Xpert"
          'orange-glow': '#FF5E33',
          amber: '#FBA94B',       // From "STEM"
          'amber-light': '#FED7AA',
          gold: '#F59E0B',
          accent: '#7C3AED'
        }
      },
      screens: {
        'tablet': '768px',
        'tablet-lg': '1024px',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 14s linear infinite',
        'float': 'float 3s ease-in-out infinite'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 15px rgba(255, 70, 18, 0.5))' },
          '50%': { opacity: 0.85, filter: 'drop-shadow(0 0 25px rgba(251, 169, 75, 0.7))' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
