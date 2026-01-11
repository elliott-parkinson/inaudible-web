import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

import fs from 'node:fs';

export default defineConfig({
  plugins: [preact()],
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost-cert.pem'),
    },
    port: 3000, // or any port you prefer
  },
});
