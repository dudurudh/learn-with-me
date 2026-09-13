import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Deployed at https://dudurudh.github.io/learn-with-me/ — the base path must match
// the repo name exactly or every asset 404s on Pages while working fine locally.
export default defineConfig({
  base: '/learn-with-me/',
  plugins: [react(), tailwindcss()],
})
