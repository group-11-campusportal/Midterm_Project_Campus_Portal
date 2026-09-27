import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: './' keeps asset paths relative so the build works on GitHub Pages
// subpaths (e.g. /Campus-Portal/) without extra config.
export default defineConfig({
  plugins: [react()],
  base: './',
})
