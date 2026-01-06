import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')

  return {
    server: {
      proxy: {
        '/api': {
          target: env.VITE_HA_URL || 'http://localhost:8123',
          changeOrigin: true,
          secure: false, // Allow self-signed certs
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Always inject auth token for API requests (needed for img/video tags)
              const token = env.VITE_HA_TOKEN
              if (token) {
                proxyReq.setHeader('Authorization', `Bearer ${token}`)
              } else if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization)
              }
            })
          },
        },
        // Proxy for Frigate to avoid CORS issues
        '/frigate-api': {
          target: env.VITE_FRIGATE_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/frigate-api/, '/api'),
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.svg', 'icon-512.svg'],
        manifest: {
          name: 'Home Assistant Dashboard',
          short_name: 'HA Dashboard',
          description: 'Control your Home Assistant devices',
          theme_color: '#1e293b',
          background_color: '#0f172a',
          display: 'standalone',
          icons: [
            {
              src: 'icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            },
            {
              src: 'icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        }
      })
    ]
  }
})
