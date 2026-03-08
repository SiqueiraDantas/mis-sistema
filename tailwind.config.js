/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        amarelo:  { DEFAULT: '#F5A623', dark: '#D4881A', light: '#FAC05E' },
        azul:     { DEFAULT: '#3A7EC6', dark: '#2C62A0', light: '#6BA3D6' },
        marrom:   { DEFAULT: '#7B4A2D', dark: '#5C3520', light: '#A0714F' },
        verde:    { DEFAULT: '#2E7D32', dark: '#1B5E20', light: '#43A047' },
        mis: {
          bg:       '#0f0f0f',
          bg2:      '#181818',
          bg3:      '#222222',
          borda:    '#2e2e2e',
          texto:    '#e8e8e8',
          texto2:   '#999999',
        }
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.25rem',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.3)',
        glow: '0 0 20px rgba(245,166,35,0.15)',
      }
    },
  },
  plugins: [],
}