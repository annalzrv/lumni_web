import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        briefShimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
        briefDot: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.35' },
          '50%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        briefLineWave: {
          '0%, 100%': { opacity: '0.12' },
          '50%': { opacity: '0.92' },
        },
      },
      animation: {
        briefShimmer: 'briefShimmer 2.2s ease-in-out infinite',
        briefDot: 'briefDot 1.05s ease-in-out infinite',
        briefLineWave: 'briefLineWave 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
