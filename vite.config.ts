import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Deployed at https://learnwithme.dudurudh.com/ — a custom domain, so Pages serves
// the site from the root and the base path is '/'. It must match how the site is
// actually served or every asset 404s in production while working fine locally.
// (github.io/learn-with-me/ now 301s to the custom domain.)
export default defineConfig({
  // Stamped into the service worker URL so a deploy retires the old caches.
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16)) },
  base: '/',
  plugins: [react(), tailwindcss()],
})
