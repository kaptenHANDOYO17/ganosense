import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' agar hasil build juga bisa dibuka sebagai situs statis (demo)
export default defineConfig({
  plugins: [react()],
  base: './',
  // DEMO_SINGLE=1 → gambar ikut ditanam di JS (untuk demo satu-berkas)
  build: { chunkSizeWarningLimit: 1500, assetsInlineLimit: process.env.DEMO_SINGLE ? 10_000_000 : 4096 },
})
