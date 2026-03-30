import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'lexai-navy': '#1E3A5F',
        'lexai-blue': '#2E5F8A',
        'lexai-gold': '#D4AF37',
      },
    },
  },
  plugins: [],
};
export default config;
