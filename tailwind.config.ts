import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'Roboto', 'system-ui', 'sans-serif'],
        serif: ['"Literata Variable"', '"New York"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
