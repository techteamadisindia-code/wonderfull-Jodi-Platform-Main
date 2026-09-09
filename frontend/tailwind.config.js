/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff5f5',
          100: '#fed7d7',
          200: '#feb2b2',
          300: '#fc8181',
          400: '#f56565',
          500: '#e53e3e',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        wedding: {
          cream: '#faf7f2',
          ivory: '#fbf8f3',
          pink: '#f6d5d5',
          softpink: '#fdf2f2',
          gold: '#d97706',
          darkgold: '#b45309',
<<<<<<< HEAD
        },
        jodi: {
          red: '#E51F3E',
          dark: '#111827',
          cream: '#FFF9F5',
          softpink: '#FFF1F3',
          gold: '#C9A227',
        }
      },
      screens: {
        'xs': '360px',
      },
=======
        }
      },
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        cinzel: ['Cinzel', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: []
};

