import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    entries: ['lrc-sync-tool.html', 'src/lrc-sync-tool/main.tsx'],
  },
  build: {
    outDir: 'dist-lrc-sync-tool',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        lrcSyncTool: path.resolve(__dirname, 'lrc-sync-tool.html'),
      },
    },
  },
});
