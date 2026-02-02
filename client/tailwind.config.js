/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom animations
      animation: {
        'dice-roll': 'diceRoll 0.6s ease-in-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-in',
        'fade-out': 'fadeOut 0.3s ease-out',
        'bounce-slow': 'bounce 2s infinite',
        'shake': 'shake 0.5s ease-in-out',
        'piece-move': 'pieceMove 0.5s ease-out',
      },
      keyframes: {
        diceRoll: {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '25%': { transform: 'rotate(90deg) scale(1.15)' },
          '50%': { transform: 'rotate(180deg) scale(1)' },
          '75%': { transform: 'rotate(270deg) scale(1.15)' },
        },
        slideDown: {
          '0%': { 
            transform: 'translateY(-100%)',
            opacity: '0'
          },
          '100%': { 
            transform: 'translateY(0)',
            opacity: '1'
          },
        },
        slideUp: {
          '0%': { 
            transform: 'translateY(100%)',
            opacity: '0'
          },
          '100%': { 
            transform: 'translateY(0)',
            opacity: '1'
          },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '75%': { transform: 'translateX(10px)' },
        },
        pieceMove: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      // Custom colors for Ludo
      colors: {
        ludo: {
          red: {
            light: '#fca5a5',
            DEFAULT: '#ef4444',
            dark: '#dc2626',
          },
          blue: {
            light: '#93c5fd',
            DEFAULT: '#3b82f6',
            dark: '#2563eb',
          },
          green: {
            light: '#86efac',
            DEFAULT: '#22c55e',
            dark: '#16a34a',
          },
          yellow: {
            light: '#fde047',
            DEFAULT: '#eab308',
            dark: '#ca8a04',
          },
          gold: '#fbbf24',
        }
      },
      // Custom box shadows
      boxShadow: {
        'game': '0 10px 40px -10px rgba(0, 0, 0, 0.25)',
        'piece': '0 4px 12px rgba(0, 0, 0, 0.3)',
        'dice': '0 8px 20px rgba(0, 0, 0, 0.2)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.5)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.6)',
        'glow-blue': '0 0 15px rgba(59, 130, 246, 0.6)',
        'glow-green': '0 0 15px rgba(34, 197, 94, 0.6)',
        'glow-yellow': '0 0 15px rgba(234, 179, 8, 0.6)',
      },
      // Custom spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
      },
    },
  },
  plugins: [],
}