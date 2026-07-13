import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Configuration de test isolée de vite.config.js pour garder le build de
// production léger. Couverture v8 exportée en lcov (consommé par SonarQube).
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/i18n/**',
        'src/**/*.test.{js,jsx}',
        'src/test/**',
        // Wrappers de bibliothèques tierces lourdes (jsPDF, xlsx) : la logique
        // testable vit en amont, ces fichiers ne font qu'appeler la lib.
        'src/utils/pdf.js',
        'src/utils/excel.js',
        // Non testable unitairement en jsdom (API navigateur / rendu graphique) :
        //  - QrScannerModal : getUserMedia (caméra) + décodage jsQR en direct
        //  - DashboardPage : Recharts a besoin d'un vrai layout (0×0 en jsdom)
        //  - AppRouter / MainLayout : câblage de routage/navigation (intégration)
        'src/components/ui/QrScannerModal.jsx',
        'src/pages/dashboard/DashboardPage.jsx',
        'src/router/AppRouter.jsx',
        'src/components/layout/MainLayout.jsx',
      ],
      // Seuils = garde-fou de non-régression (légèrement sous le niveau actuel).
      thresholds: {
        statements: 65,
        branches: 65,
        functions: 58,
        lines: 65,
      },
    },
  },
});
