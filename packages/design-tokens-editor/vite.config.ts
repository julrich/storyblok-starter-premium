import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@kickstartds/design-system/tokens/token-graph.json": resolve(
        __dirname,
        "../design-system/dist/tokens/token-graph.json",
      ),
    },
  },
  build: {
    outDir: "dist/app",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        preview: resolve(__dirname, "preview.html"),
      },
    },
  },
  publicDir: "node_modules/@kickstartds/design-system/dist/static",
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4200",
    },
  },
});
