import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Same security headers as the production web server (deploy/security-headers.conf), used by
// `npm run preview`. Not used by `npm run dev`: React's hot reload injects an inline script that
// script-src 'self' would block.
const securityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
    "font-src 'self' data:; media-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; " +
    "base-uri 'self'; form-action 'self' https://accounts.google.com; frame-ancestors 'self'",
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
}

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
    // The preview server reuses server.proxy; Flask's own headers replace these on proxied responses.
    preview: {
      headers: securityHeaders,
    },
  }
})
