/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void:    { DEFAULT: '#080B10', 50: '#0D1117', 100: '#0A0D12' },
        slate:   { 850: '#111827', 900: '#0F172A', 950: '#090E18' },
        crimson: { DEFAULT: '#E63946', 400: '#FF4D5A', 600: '#C1121F', 900: '#3D0009' },
        amber:   { DEFAULT: '#F4A261', 400: '#FFB570', 600: '#D4843B', 900: '#3D2000' },
        emerald: { DEFAULT: '#2A9D8F', 400: '#3BBDAD', 600: '#1E7A6F', 900: '#002D29' },
        electric:{ DEFAULT: '#00D9FF', 400: '#40E8FF', 600: '#009AB8', 900: '#002D38' },
        neon:    { DEFAULT: '#7B2FBE', 400: '#9B5FDE', 600: '#5B1F8E', 900: '#1A0038' },
      },
      fontFamily: {
        mono:    ['"JetBrains Mono"', 'Consolas', 'monospace'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':      'fadeIn 0.4s ease forwards',
        'slide-up':     'slideUp 0.4s ease forwards',
        'glow-crimson': 'glowCrimson 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:      { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:     { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glowCrimson: { from: { boxShadow: '0 0 4px #E6394640' }, to: { boxShadow: '0 0 20px #E6394680' } },
      },
    },
  },
  plugins: [],
};
