import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          cyan: '#00C4CC',
          'cyan-bright': '#00F0FF',
          'cyan-glow': '#00C4CC',
          'cyan-dark': '#00969D',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
          950: '#083344',
        },
        base: {
          DEFAULT: '#060A11',
          raised: '#0B121E',
          card: '#0F1A2A',
          'card-hover': '#152238',
          border: '#1E2C40',
          'border-glow': 'rgba(0, 196, 204, 0.3)',
        },
        silver: {
          DEFAULT: '#CBD5E1',
          bright: '#F8FAFC',
          dim: '#8E9BAE',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(0, 196, 204, 0.35)',
        'glow-sm': '0 0 12px rgba(0, 196, 204, 0.22)',
        'glow-lg': '0 0 40px rgba(0, 196, 204, 0.5)',
        'glow-amber': '0 0 25px rgba(245, 158, 11, 0.35)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.35)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(circle at 50% 0%, rgba(0, 196, 204, 0.15) 0%, rgba(6, 10, 17, 0) 65%)',
        'mesh-glow':
          'radial-gradient(at 0% 0%, rgba(0, 196, 204, 0.12) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(14, 116, 144, 0.1) 0px, transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        shine: 'shine 0.85s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
