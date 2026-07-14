/** @type {import('tailwindcss').Config} */
export default {
  // Les fichiers de test (et le faux backend qui les alimente) ne doivent pas
  // nourrir le scan Tailwind : leurs chaînes entre crochets étaient prises pour
  // des classes utilitaires arbitraires et polluaient la CSS de production.
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    '!./src/test/**',
    '!./src/**/*.test.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        afriland: {
          red: '#C8102E',
          'red-dark': '#9B0C23',
          'red-light': '#F4D3D9',
          black: '#111111',
          white: '#FFFFFF',
          gray: {
            50: '#F5F5F5',
            200: '#E5E5E5',
            400: '#9CA3AF',
            600: '#595959',
          },
        },
        visa: {
          pending: '#F5C518',
          progress: '#2563EB',
          granted: '#16A34A',
          refused: '#DC2626',
          complement: '#F97316',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Tahoma', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        arabesque: "url(\"/src/assets/patterns/arabesque.svg\")",
      },
    },
  },
  plugins: [],
};
