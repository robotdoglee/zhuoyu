import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    // 本地开发时通过 Vite 代理访问 arXiv API，绕过浏览器跨域限制。
    // 生产构建为纯静态站点，arXiv 若被拦截会自动回退到 OpenAlex。
    proxy: {
      '/api/arxiv': {
        target: 'https://export.arxiv.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/arxiv/, '/api'),
      },
    },
  },
})
