import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: gọi /api/* sẽ được chuyển tới FastAPI (bỏ tiền tố /api) để khỏi vướng CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
