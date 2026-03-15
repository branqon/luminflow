import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/luminflow/' : '/',
  plugins: [react()],
  server: {
    port: 8080,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
}));
