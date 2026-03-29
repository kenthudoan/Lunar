/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'monospace'],
      },
      colors: {
        // Design system tokens (Tailwind can use these as arbitrary values)
        // but we prefer CSS vars for consistency. This extends the palette.
        lunar: {
          950: '#05050A',
          900: '#0c0c16',
          800: '#13131f',
          700: '#191928',
          600: '#22223a',
          500: '#2d2d4a',
          400: '#c8c8d8',
          300: '#e0e0ec',
          200: '#f0f0f8',
        },
        // Semantic aliases
        surface: '#0c0c16',
        elevated: '#13131f',
        overlay: '#191928',
        accent: {
          DEFAULT: '#c8c8d8',
          hover: '#e0e0ec',
          muted: 'rgba(200, 200, 216, 0.12)',
          glow: 'rgba(200, 200, 216, 0.15)',
        },
      },
      backgroundImage: {
        'space': "url('/lunar-bg.jpg')",
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      maxWidth: {
        'prose': '780px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '28px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
