import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Flask (DMS-BE/app.py) listens on DMS_HOST:DMS_PORT, 127.0.0.1:5000 by default.
  const target = env.DMS_BACKEND_URL || 'http://127.0.0.1:5000'
  // changeOrigin stays false: Flask then builds redirect and OAuth callback URLs with the
  // browser's host (this dev server), so SSO and Gmail callbacks come back through the proxy.
  const proxy = { target, changeOrigin: false }
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': proxy,
        '/auth': proxy, // /auth/oidc/*, /auth/saml/* (the SPA has no /auth/* routes)
        '/gmail/oauth2callback': proxy, // only the callback: /gmail itself is an SPA page
        '/static': proxy,
      },
    },
  }
})
