# DMS-FE: Archive DMS web app (React)

The browser front end for the Document Management System in `../DMS-BE`. It is a React single-page app that
replaces the Flask/Jinja pages. It looks and behaves the same, keeps the same URLs, and talks to the
backend only through the JSON API at `/api/v1`.

`MIGRATION.md` lists which template became which page, which API call replaces each form, and the gaps
where `/api/v1` does not return something the old pages showed.

## Requirements

- Node.js 20 or newer (tested with Node 24) and npm.
- The backend from `../DMS-BE` with its Python virtual environment (see its README).

## Run it locally

1. Start the backend (it listens on `127.0.0.1:5000` by default):

   ```powershell
   cd ..\DMS-BE
   venv\Scripts\activate
   python app.py
   ```

   Keep `LEGACY_UI_ENABLED` off (the default). Flask then serves only the API and the sign-in/OAuth
   callbacks, and this app owns every page URL.

2. Start the front end:

   ```powershell
   cd ..\DMS-FE
   npm install
   npm run dev
   ```

3. Open http://localhost:5173. On an empty database you are sent to `/setup` to create the first
   administrator. Setup is only allowed from the server itself unless `DMS_ALLOW_REMOTE_SETUP=true`.

### How the dev proxy works

`vite.config.js` forwards these paths to Flask, so the browser sees a single origin:

| Path | Why |
|---|---|
| `/api` | The JSON API. |
| `/auth` | OIDC and SAML sign-in (`/auth/oidc/<name>`, `/auth/saml/*`). The app has no `/auth/*` pages. |
| `/gmail/oauth2callback` | Google's OAuth callback. Only the callback: `/gmail` itself is an app page. |
| `/static` | Kept for completeness. Flask serves no static files while the legacy UI is off. |

Because the origin is the same, the `dms_session` cookie (`HttpOnly`, `SameSite=Lax`) and the
`X-CSRFToken` header work without CORS. The proxy keeps the browser's `Host` header (`changeOrigin: false`),
so Flask builds redirect and callback URLs that point back at the dev server.

To use a backend on another address, set `DMS_BACKEND_URL` when starting Vite:

```powershell
$env:DMS_BACKEND_URL = 'http://127.0.0.1:5055'; npm run dev
```

### Backend settings the app relies on

Set these in `DMS-BE/.env` (none are required for basic use):

| Variable | Value | Why |
|---|---|---|
| `DMS_ANGULAR_FRONTEND_URL` | `http://localhost:5173` (the app's URL) | Where Flask sends the browser after SSO, an MFA hand-off or the Gmail OAuth callback. The name is historical; any SPA URL works. Unset, Flask redirects to `/`, which also works behind the proxy. |
| `DMS_APP_NAME` | e.g. `Archive DMS` | Shown by the backend (OTP issuer). The app shows `VITE_APP_NAME` (below) because the API does not return the name. |
| `SECRET_KEY` | a long random string | Keeps sessions valid across backend restarts. |

## App settings

Vite reads `VITE_*` variables from `.env`, `.env.local` or the environment at build time.

| Variable | Default | Meaning |
|---|---|---|
| `VITE_APP_NAME` | `Archive DMS` | Name in the sidebar, sign-in pages and page titles (`<Page> · <name>`). |
| `VITE_API_BASE` | empty (same origin) | Backend origin, e.g. `https://dms-api.example.com`. Only needed when the app and API are on different origins (see below). |
| `DMS_BACKEND_URL` | `http://127.0.0.1:5000` | Dev proxy target (used by `npm run dev` only). |

## Running without the proxy (API on another origin)

If the app and the API must run on different origins, for example `https://dms.example.com` and
`https://dms-api.example.com`:

1. Build the app with `VITE_API_BASE=https://dms-api.example.com`.
2. In `DMS-BE/.env`:

   ```ini
   DMS_CORS_ALLOWED_ORIGINS=https://dms.example.com
   SESSION_COOKIE_SAMESITE=None
   SESSION_COOKIE_SECURE=true
   DMS_ANGULAR_FRONTEND_URL=https://dms.example.com
   ```

   `DMS_CORS_ALLOWED_ORIGINS` must contain the app's exact origin. `.env.example` has
   `http://localhost:4200`, which is not this app's port. A cross-site session cookie needs `SameSite=None`,
   which the backend only accepts together with `Secure`, so both sides must use HTTPS. The same list of
   origins also lets the document preview iframes load from the API (`frame-ancestors`).

Same-origin hosting (next section) avoids all of this and is the recommended setup.

## Production build

```powershell
npm run build      # writes dist/
npm run preview    # serves dist/ locally for a quick check
```

Serve `dist/` and Flask from one origin behind a reverse proxy. Requests to `/api/`, `/auth/` and
`/gmail/oauth2callback` go to Flask. Every other path that is not a file in `dist/` must return
`dist/index.html`, because the app handles routes like `/folders/12` itself. For example, with nginx:

```nginx
location /api/                  { proxy_pass http://127.0.0.1:5000; }
location /auth/                 { proxy_pass http://127.0.0.1:5000; }
location /gmail/oauth2callback  { proxy_pass http://127.0.0.1:5000; }
location /                      { root /srv/dms-fe/dist; try_files $uri /index.html; }
```

Pass `Host` and `X-Forwarded-*` headers through and set `DMS_TRUSTED_PROXIES`, so that Flask builds
correct callback URLs.

A complete, security-scanned setup is in [deploy/](deploy/). Install steps are at the top of
`nginx-dms.conf`.

- `nginx-dms.conf` is the site. It hides the nginx version (`server_tokens off`), raises the upload
  limit and caches the hashed `/assets/` files.
- `security-headers.conf` adds the security headers to the app's static files: Content-Security-Policy,
  X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Permissions-Policy. Flask already sends
  these on API responses, so the snippet is included only in the static locations. A second CSP added by
  nginx would be enforced on top of the per-route policies Flask sets for previews and email bodies.
- `proxy.conf` holds the proxy headers and timeouts for the Flask locations.

Keep the CSP in `security-headers.conf` in line with `DEFAULT_CONTENT_SECURITY_POLICY` in
`DMS-BE/dms/config.py`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload and the API proxy (port 5173). |
| `npm run build` | Production build into `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | oxlint. |

## Project layout

```
src/
  api/          client.js (fetch, CSRF, error codes, XHR uploads) + one module per area
  auth/         AuthProvider (session, capabilities, home folder), RequireAuth, RequireCap
  components/   ports of _macros.html and app.js: Icon, FileTypeBadge, EmptyState, Pagination,
                SortHeader, ActionButton, FavouriteButton, FolderSelect, MetadataFields, SearchBox,
                DocumentTable, Toasts, SafeMarkup, …
  components/modals/   upload, new folder, new version / check-in, rename, move/copy/shortcut, confirm
  layouts/      AppLayout (base.html), AuthLayout (auth/_layout.html), RootLayout (providers)
  pages/        one component per template, same folders as templates/
  hooks/        shared react-query hooks, page title
  lib/          formatting and constants ported from the backend, toast store, folder tree
  styles/app.css   copied unchanged from DMS-BE/dms/static/css/app.css
  router.jsx    the routes (same URLs as the Flask pages)
  main.jsx
```

## How it talks to the backend

- Every request sends the session cookie (`credentials: 'include'`). Unsafe methods also send
  `X-CSRFToken`, taken from `GET /api/v1/auth/csrf` and replaced by the token that login and MFA return.
  On `csrf_failed` the client fetches a new token and retries once.
- Error codes are handled in one place. `authentication_required` goes to `/login?next=…`,
  `mfa_required` to `/mfa`, `mfa_setup_required` to `/account/mfa`, `pending` to `/device-pending`, and
  `blocked`, `platform` or `device` to `/blocked`. Other errors appear in a toast, or inline in forms.
- Downloads, ZIP exports and `.eml` files are plain links to `/api/v1/...`. Document previews are
  iframes pointing at `/api/v1/documents/<id>/preview` or `/render` (sandboxed). The email body is shown
  in a sandboxed iframe loading `/api/v1/emails/<id>/render` (`sandbox="allow-popups allow-popups-to-escape-sandbox"`,
  `referrerpolicy="no-referrer"`): a standalone page with its images as `data:` URLs and its own CSP, so the
  app's CSP needs no `'unsafe-inline'`. The email HTML is never inserted into the page.
- CSP: `style-src 'self'; script-src 'self'` (no inline styles or scripts). The same policy is in
  `deploy/security-headers.conf`, `vite.config.js` (`securityHeaders`, also written into the built
  `index.html` as a `<meta>` tag without `frame-ancestors`) and the `map` in `deploy/nginx-dms.conf`.
  Use React `style={{…}}` props, never `style="…"` strings, `dangerouslySetInnerHTML` or `srcdoc`.
- `/api/v1/me` does not return capabilities, the home folder or the app name. The app works them out
  from other endpoints. See `MIGRATION.md`, gap G1.

## Libraries

React 19, `react-router-dom` 7 (routing), `@tanstack/react-query` 5 (server state, caching, polling) and
`qrcode` (draws the MFA enrolment QR code from the `otpauth://` URI the API returns). There is no UI kit
or CSS framework: the original stylesheet is used as is.
