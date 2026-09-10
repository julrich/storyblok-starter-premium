import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, "src/app"),
  publicDir: resolve(
    __dirname,
    "node_modules/@kickstartds/design-system/dist/static",
  ),
  build: {
    outDir: resolve(__dirname, "dist/app"),
    emptyOutDir: true,
  },
  server: {
    port: 4200,
    proxy: {
      "/api": {
        target: "http://localhost:4201",
        changeOrigin: true,
      },
    },
  },
  test: {
    root: resolve(__dirname),
    include: ["test/**/*.test.ts"],
  },
});
