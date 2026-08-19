import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

const gasDownloadPlugin = (): Plugin => ({
  name: 'gas-download-endpoint',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/api/download-gas-index') {
        const filePath = path.resolve(__dirname, 'dist/index.html');
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Content-Disposition', 'attachment; filename="Index.html"');
          res.end(content);
          return;
        } else {
          res.statusCode = 404;
          res.end('Fichier dist/index.html non trouvé.');
          return;
        }
      }
      next();
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), viteSingleFile(), gasDownloadPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      assetsInlineLimit: 100000000,
      chunkSizeWarningLimit: 100000000,
      cssCodeSplit: false,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
