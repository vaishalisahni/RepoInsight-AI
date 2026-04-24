export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        ink: {
          50:  '#f0f2ff',
          100: '#e3e6ff',
          200: '#c7cdff',
          300: '#a3a9fc',
          400: '#7c7ff5',
          500: '#5c5be8',
          600: '#4a40d0',
          700: '#3c33a8',
          800: '#322c85',
          900: '#1e1a50',
          950: '#0d0b2a',
        },
        surface: {
          0:   '#07060f',
          50:  '#0e0c1f',
          100: '#131128',
          200: '#1a1735',
          300: '#221f42',
          400: '#2e2a55',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.35s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      }
    },
  },
  plugins: [],
};