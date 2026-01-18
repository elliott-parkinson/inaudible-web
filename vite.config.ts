import { defineConfig } from "vite";
import fs from 'node:fs';

export default defineConfig(({ command, mode }) => {
  const isDev = command === "serve";

  return {
    server: {
      host: "0.0.0.0",
      port: 5173,
      https: {
        key: fs.readFileSync('./localhost-key.pem'),
        cert: fs.readFileSync('./localhost-cert.pem'),
      },   // HTTPS only in dev
    },
    preview: {
      allowedHosts: ["inaudible.hylia.network"],
      host: "0.0.0.0",
      port: 5173,
      https: false,   // Always HTTP in prod
    }
  };
});
