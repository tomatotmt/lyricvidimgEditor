import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    // Force React and React DOM to resolve to the root package's node_modules to avoid hook errors
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    }
  },
  optimizeDeps: {
    entries: ['index.html', 'lrc-sync-tool.html', 'src/web-editor/main.tsx', 'src/lrc-sync-tool/main.tsx'],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        lrcSyncTool: path.resolve(__dirname, 'lrc-sync-tool.html'),
      },
    },
  },
});
