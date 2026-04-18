import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  envDir: '..',   // load .env/.env.local from project root, not src/
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
})
