import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Use relative paths for S3 hosting at subpaths
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    allowedHosts: [
      'mac.lumerahq.com',
      'untunable-del-nonephemerally.ngrok-free.dev',
    ],
  },
});
