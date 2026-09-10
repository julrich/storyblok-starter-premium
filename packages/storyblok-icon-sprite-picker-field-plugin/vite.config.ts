import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'
import { plugins } from '@storyblok/field-plugin/vite'

export default defineConfig({
  plugins: [react(), cssInjectedByJs(), ...plugins],
  build: {
    rollupOptions: {
      output: {
        format: 'commonjs',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  server: {
    port: 8080,
    host: true,
  },
})
