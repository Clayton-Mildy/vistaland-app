import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: v('brand'), dark: v('brand-dark'), tint: v('brand-tint') },
        gold: '#E8BE5A',
        ink: '#111827',
        paper: '#F6F4F0',
        line: '#ECE8E1',
        moni: '#B56B3A',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      boxShadow: {
        card: '0 1px 2px rgba(17,24,39,0.04), 0 4px 16px rgba(17,24,39,0.05)',
        lift: '0 8px 30px rgba(17,24,39,0.12)',
      },
      keyframes: {
        scan: { '0%': { top: '0%' }, '100%': { top: '100%' } },
        pop: { '0%': { transform: 'scale(.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        rise: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        fall: { '0%': { transform: 'translateY(-10vh) rotate(0)' }, '100%': { transform: 'translateY(110vh) rotate(540deg)' } },
      },
      animation: {
        scan: 'scan 1.2s ease-in-out infinite alternate',
        pop: 'pop .2s ease-out',
        rise: 'rise .25s ease-out',
        fall: 'fall 2.8s linear forwards',
      },
    },
  },
  plugins: [],
} satisfies Config;
