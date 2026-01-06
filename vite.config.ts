import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  plugins: [preact()],
  server: {
    proxy: {
      '/api': {
        target: 'https://audible.hylia.network',
        changeOrigin: true,
        secure: false,
      },
    },
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost-cert.pem'),
    },
    port: 3000, // or any port you prefer
  },
});
