import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: './' keeps every asset path relative, so the build can be served from
// a GitHub Pages project subpath (e.g. /Campus-Portal/) without extra config.
export default defineConfig({
  plugins: [react()],
  base: './',
})
