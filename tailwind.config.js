/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#121820',
        ember: '#ff6a3d',
        cyan: '#20c2d3',
        sand: '#f7f0dd'
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace']
      },
      boxShadow: {
        glow: '0 0 40px rgba(32, 194, 211, 0.18)'
      },
      keyframes: {
        floatIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        floatIn: 'floatIn 420ms ease-out forwards'
      }
    }
  },
  plugins: []
};
