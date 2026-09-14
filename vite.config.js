import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // The sign-in screen needs auth only; the database SDK arrives
            // with the shell, after a partner is through the gate.
            if (id.includes('firebase') || id.includes('@firebase')) {
              if (id.includes('database')) return 'vendor-firebase-db';
              return 'vendor-firebase-auth';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
});

