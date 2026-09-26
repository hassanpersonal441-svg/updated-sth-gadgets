import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: '#050608',
          raised: '#0B0D11',
          card: '#0F1319',
          border: '#1C222B',
        },
        electric: {
          DEFAULT: '#2E9BFF',
          bright: '#5FC1FF',
          dim: '#1A6FBF',
          glow: '#3BB4FF',
        },
        silver: {
          DEFAULT: '#C9D2DB',
          bright: '#F2F5F8',
          dim: '#8A94A0',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(59, 180, 255, 0.35)',
        'glow-sm': '0 0 12px rgba(59, 180, 255, 0.25)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(circle at 50% 0%, rgba(46,155,255,0.14) 0%, rgba(5,6,8,0) 60%)',
      },
    },
  },
  plugins: [],
};
export default config;
