import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import { rmSync } from 'node:fs';
import path from 'node:path';

export default defineConfig(({ command }) => {
  rmSync('dist-electron', { recursive: true, force: true });
  const isDev = command === 'serve';

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      react(),
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            build: {
              sourcemap: isDev,
              minify: !isDev,
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['better-sqlite3', 'electron'],
              },
            },
          },
        },
        preload: {
          input: path.join(__dirname, 'electron/preload.ts'),
          vite: {
            build: {
              sourcemap: isDev ? 'inline' : false,
              minify: !isDev,
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron'],
              },
            },
          },
        },
      }),
    ],
    server: {
      port: 5180,
      strictPort: true,
    },
    clearScreen: false,
  };
});
