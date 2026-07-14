import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Les fichiers .env ne sont pas injectés dans process.env au niveau de la
  // config : on les charge explicitement pour connaître la cible du proxy.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      // En dev, /api est proxifié vers le backend Spring Boot (conteneur publié
      // sur 127.0.0.1:8080 par docker compose), comme le fait Nginx en prod.
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: true,
      port: 4173,
    },
  };
});
