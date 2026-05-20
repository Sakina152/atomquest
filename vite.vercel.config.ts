// vite.vercel.config.ts
// Lightweight Vite config for Vercel deployment.
// Bypasses the @lovable.dev/vite-tanstack-config (which adds the Cloudflare Workers
// SSR pipeline) and produces a standard static SPA in /dist for Vercel hosting.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
});
