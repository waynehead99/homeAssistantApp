/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Extended slate for deeper darks
        slate: {
          950: '#020617',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glow-sm': '0 0 10px currentColor',
        'glow': '0 0 20px currentColor',
        'glow-lg': '0 0 30px currentColor',
        'inner-light': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'inner-dark': 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 30% 10%, rgba(59, 130, 246, 0.08) 0px, transparent 50%), radial-gradient(at 80% 20%, rgba(34, 211, 238, 0.06) 0px, transparent 50%), radial-gradient(at 10% 60%, rgba(99, 102, 241, 0.05) 0px, transparent 50%), radial-gradient(at 90% 80%, rgba(34, 197, 94, 0.04) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}
