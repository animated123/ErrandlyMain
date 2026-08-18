import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    hmr: false,
    allowedHosts: [
      'errandlymain.onrender.com',
      '.onrender.com',
      'errandly.site',
      '.errandly.site',
      'localhost',
      '127.0.0.1'
    ],
  },
})
