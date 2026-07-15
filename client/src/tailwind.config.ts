import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        luxury: {
          base: '#0F2942',
          dark: '#0A1118',
          accent: {
            gold: '#D4AF37',
            purple: '#6B4AA3',
          },
          neutral: '#E8E8E8',
          border: 'rgba(212, 175, 55, 0.2)',
        },
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 6s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
