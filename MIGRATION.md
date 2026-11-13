# Jinja → React migration

This file maps every Jinja template in `DMS-BE/dms/templates/` to a React page in this project, and every
page action to the `/api/v1` call that replaces it. **Gaps** lists what the Jinja pages show or do that
`/api/v1` does not provide today, with the backend change that would close each one.

Field names were taken from `DMS-BE/dms/routes/api.py`. Nothing here assumes an endpoint that does not exist.

## Facts about the backend that shape the SPA

- `LEGACY_UI_ENABLED` is `False` by default (`config.py`). The Jinja blueprints, `/static` and the
  templates are then **not registered**: Flask only serves `/api/v1/*`, `/auth/oidc/*`, `/auth/saml/*`
  and `/gmail/oauth2callback`. The SPA owns every other URL, so it keeps the Jinja URLs (`/folders/12`,
  `/documents/5`, …) and bookmarks keep working.
- The logo is copied to `public/logo.svg` because Flask no longer serves `/static`.
- SSO, MFA and Gmail callbacks redirect to `DMS_ANGULAR_FRONTEND_URL` (despite the name, any SPA URL)
  or to `/` when it is unset. They add `?mfa_required=1` or `?auth_error=<pending|blocked|platform|device|sso_failed>`.
  The Gmail callback adds `?gmail=connected|error&message=<text>`. The SPA reads these query parameters on
  load in `src/auth/AuthProvider.jsx`; the Gmail ones become a toast and are removed from the URL.
- Device problem codes (`security/auth.py` `device_problem`): `pending` → `/device-pending`;
  `blocked`, `platform`, `device` → `/blocked`.
- `abort()` inside `/api/v1` returns `{ok:false, error, code}` with `code` = `forbidden`, `not_found`, … (the
  JSON error handler in `dms/__init__.py`), so every API error is JSON.

## Templates → routes → components → endpoints

| Template | React route | Page component | API endpoints used |
|---|---|---|---|
| `base.html` | layout for all signed-in routes | `layouts/AppLayout.jsx` (+ `components/SearchBox.jsx`, `components/modals/*`) | `GET /me`, `GET /folders`, `GET /folders/root` (repository permissions), `GET /documents` (name suggestions) |
| `_macros.html` | — | `components/Icon`, `FileTypeBadge`, `EmptyState`, `Pagination`, `SortHeader`, `EmailStateBadge`, `ActionButton`, `FavouriteButton` | `PUT/DELETE /favourites/<kind>/<id>`, `GET /favourites` |
| `auth/_layout.html` | layout for auth routes | `layouts/AuthLayout.jsx` | — |
| `auth/login.html` | `/login` | `pages/auth/Login.jsx` | `GET /auth/options`, `GET /auth/csrf`, `POST /auth/login` |
| `auth/mfa.html` | `/mfa` | `pages/auth/Mfa.jsx` | `POST /auth/mfa`, `POST /auth/logout` |
| `auth/register.html` | `/register` | `pages/auth/Register.jsx` | `GET /auth/options`, `POST /auth/register` |
| `auth/setup.html` | `/setup` | `pages/auth/Setup.jsx` | `GET /auth/options`, `POST /auth/setup` |
| `auth/message.html` | `/device-pending`, `/blocked` | `pages/auth/Message.jsx` | — |
| `error.html` | `*` and route error boundary | `pages/ErrorPage.jsx` | — |
| `dashboard.html` | `/` | `pages/Dashboard.jsx` | `GET /dashboard`, `GET /documents` (all pages), `GET /recycle-bin`, `GET /emails?per_page=6`, `GET /activity?per_page=8`, `GET /gmail/status` |
| — (`main.my_files` redirect) | `/my-files` | `pages/MyFiles.jsx` | `GET /me` (see Gaps G1) |
| `shared.html` | `/shared` | `pages/Shared.jsx` | `GET /shared` |
| `favourites.html` | `/favourites` | `pages/Favourites.jsx` | `GET /favourites` |
| `recent.html` | `/recent` | `pages/Recent.jsx` | `GET /recent`, `GET /documents` (all pages) |
| `recycle_bin.html` | `/recycle-bin` | `pages/RecycleBin.jsx` | `GET /recycle-bin`, `DELETE /recycle-bin`, `POST /folders/<id>/restore`, `DELETE /folders/<id>/purge`, `POST /documents/<id>/restore`, `DELETE /documents/<id>/purge` |
| `versions.html` | `/versions` | `pages/Versions.jsx` | `GET /versions?limit=200` |
| `activity.html` | `/activity` (cap `audit`) | `pages/Activity.jsx` | `GET /activity?page=&per_page=50` |
| `search.html` | `/search` | `pages/Search.jsx` | `GET /search`, `GET /folders`, `GET /metadata/schema`, `GET /directory` |
| `documents/index.html` | `/documents` | `pages/documents/DocumentsIndex.jsx` | `GET /documents` (all pages, filtered client-side; see G3), `GET /folders` |
| `documents/_table.html` | — | `components/DocumentTable.jsx` | `DELETE /documents/<id>`, `DELETE /documents/links/<id>` |
| `documents/detail.html` | `/documents/:id` | `pages/documents/DocumentDetail.jsx` | `GET /documents/<id>`, `GET /documents/<id>/preview`, `/render`, `/content`, `GET /metadata/schema`, `PATCH /documents/<id>`, `POST /documents/<id>/versions`, `/checkout`, `/checkin`, `/release`, `/copy`, `/links`, `/versions/<n>/restore`, `DELETE /documents/<id>` |
| `documents/compare.html` | `/documents/:id/compare` | `pages/documents/Compare.jsx` | `GET /documents/<id>`, `GET /documents/<id>/compare?a=&b=` |
| `folders/browse.html` | `/folders`, `/folders/:id` | `pages/folders/Browse.jsx` | `GET /folders/root`, `GET /folders/<id>`, `GET /folders`, `GET /favourites`, `PATCH /folders/<id>`, `POST /folders/<id>/copy`, `DELETE /folders/<id>`, `PATCH /folders/<id>/retention`, `GET /folders[/<id>]/download` |
| `folders/history.html` | `/folders/:id/history` | `pages/folders/History.jsx` | `GET /folders/<id>`, `GET /folders/<id>/history` |
| `permissions.html` | `/permissions/:kind/:id[/:number]` | `pages/Permissions.jsx` | `GET /permissions/...`, `POST .../share`, `POST .../grant`, `DELETE .../entries/<id>`, `PATCH .../inheritance`, `GET /directory`, `GET /folders/<id>` or `GET /documents/<id>` |
| `emails/index.html` | `/emails` (every user; own emails only) | `pages/emails/EmailsIndex.jsx` | `GET /emails`, `GET /gmail/status`, `POST /gmail/sync`, `POST /gmail/retry` |
| `emails/detail.html` | `/emails/:id` (owner only; others get 404 "Email not found") | `pages/emails/EmailDetail.jsx` | `GET /emails/<id>`, `GET /emails/<id>/body`, `/eml`, `/attachments/<n>`, `POST /documents/import-email-attachment` |
| `gmail/settings.html` | `/gmail` (every user; their own mailbox) | `pages/gmail/GmailSettings.jsx` | `GET /gmail/status`, `GET /gmail/connect`, `POST /gmail/disconnect`, `POST /gmail/sync`, `POST /gmail/retry` |
| `account/profile.html` | `/account` | `pages/account/Profile.jsx` | `GET /account`, `PATCH /account/password`, `DELETE /account/mfa`, `POST /account/tokens`, `DELETE /account/tokens/<id>`, `DELETE /account/devices/<id>` |
| `account/mfa.html` | `/account/mfa` | `pages/account/MfaSetup.jsx` | `GET /auth/mfa/setup`, `POST /auth/mfa/setup` |
| `admin/_nav.html` | — | `components/AdminNav.jsx` | — |
| `admin/index.html` | `/admin` (cap `admin`) | `pages/admin/AdminIndex.jsx` | `GET /admin/status`, `POST /admin/maintenance`, `POST /admin/reindex` |
| `admin/users.html` | `/admin/users` | `pages/admin/Users.jsx` | `GET /admin/users?q=` |
| `admin/user_edit.html` | `/admin/users/new`, `/admin/users/:id` | `pages/admin/UserEdit.jsx` | `GET /admin/users/<id>`, `GET /admin/roles`, `POST /admin/users`, `PATCH /admin/users/<id>` |
| `admin/roles.html` | `/admin/roles` | `pages/admin/Roles.jsx` | `GET /admin/roles` |
| `admin/role_edit.html` | `/admin/roles/new`, `/admin/roles/:id` | `pages/admin/RoleEdit.jsx` | `GET /admin/roles`, `POST /admin/roles`, `PATCH /admin/roles/<id>`, `DELETE /admin/roles/<id>` |
| `admin/settings.html` | `/admin/settings` | `pages/admin/Settings.jsx` | `GET /admin/settings`, `PATCH /admin/settings`, `GET /admin/roles` |
| `admin/metadata.html` | `/admin/metadata` | `pages/admin/Metadata.jsx` | `GET /admin/metadata`, `GET /admin/settings`, `GET /folders`, `POST /admin/metadata/{types,fields,vocabularies,tags}`, `DELETE /admin/metadata/{types,fields,vocabularies,tags}/<id>` |
| `admin/_field_form.html` | — | `pages/admin/FieldForm.jsx` | `POST /admin/metadata/fields`, `DELETE /admin/metadata/fields/<id>` |
| `admin/_vocab_form.html` | — | `pages/admin/VocabForm.jsx` | `POST /admin/metadata/vocabularies`, `DELETE /admin/metadata/vocabularies/<id>` |
| `admin/devices.html` | `/admin/devices` | `pages/admin/Devices.jsx` | `GET /admin/devices`, `PATCH /admin/devices/<id>`, `GET /admin/settings` |
| — | `/admin/mailboxes` (cap `admin`) | `pages/admin/Mailboxes.jsx` | `GET /admin/gmail/accounts?page=&per_page=50`, `POST /gmail/retry` (status only, no email content) |

## Page actions → API calls

All calls go through `src/api/client.js`, which adds `credentials: 'include'` and, for unsafe methods, `X-CSRFToken`.

| Page | Jinja action (form POST / `post_button` / modal) | API call |
|---|---|---|
| base | Sign out (`auth.logout`) | `POST /auth/logout` |
| base | Upload modal (`documents.upload`, multi-file, XHR progress) | `POST /documents` (multipart: `file`×n, `folder_id`, `document_type_id`, `meta_<id>`, `tags`, `idempotency_key`) via XHR |
| base | New folder modal (`folders.create`) | `POST /folders` `{name, parent_id}` |
| base | Rename modal, document (`documents.rename`) | `PATCH /documents/<id>` `{name}` |
| base | Rename modal, folder (`folders.rename`) | `PATCH /folders/<id>` `{name}` |
| base | Move modal, document (`documents.move`) | `PATCH /documents/<id>` `{folder_id}` |
| base | Move modal, folder (`folders.move`) | `PATCH /folders/<id>` `{parent_id}` |
| base | Copy modal, document (`documents.copy`) | `POST /documents/<id>/copy` `{folder_id}` |
| base | Copy modal, folder (`folders.copy`) | `POST /folders/<id>/copy` `{parent_id}` |
| base | Add-shortcut modal (`documents.add_link`) | `POST /documents/<id>/links` `{folder_id}` |
| base / _table | New version modal (`documents.new_version`, XHR progress) | `POST /documents/<id>/versions` (multipart: `file`, `major`, `note`, `idempotency_key`) via XHR |
| _macros | `fav_button` (`folders.toggle_favourite`) | `PUT` / `DELETE /favourites/<kind>/<id>` |
| _table | Delete document (confirm) | `DELETE /documents/<id>` |
| _table / detail | Remove shortcut | `DELETE /documents/links/<link_id>` |
| detail | Check out | `POST /documents/<id>/checkout` |
| detail | Check-in modal (optional file) | `POST /documents/<id>/checkin` (multipart: `file?`, `major`, `note`, `idempotency_key`) |
| detail | Discard / override check-out (confirm) | `POST /documents/<id>/release` |
| detail | Save properties (`documents.update_metadata`) | `PATCH /documents/<id>` `{document_type_id, tags, meta_<id>…}` |
| detail | Restore version (confirm) | `POST /documents/<id>/versions/<n>/restore` `{idempotency_key}` |
| detail | Delete (confirm) | `DELETE /documents/<id>` |
| detail | Restore deleted document | `POST /documents/<id>/restore` (see G6) |
| detail | Compare selected (GET form) | navigate to `/documents/<id>/compare?a=&b=` |
| compare | Compare (GET form: a, b, mode) | `GET /documents/<id>/compare?a=&b=`; `mode` is client-side |
| browse | Delete folder (confirm) | `DELETE /folders/<id>` |
| browse | Version retention modal (`folders.retention`) | `PATCH /folders/<id>/retention` `{keep_last, keep_years}` |
| browse | Download folder ZIP / with versions | link `GET /folders/<id>/download[?versions=1]`, root `GET /folders/download[?versions=1]` |
| recycle bin | Empty recycle bin (confirm) | `DELETE /recycle-bin` |
| recycle bin | Restore folder / document | `POST /folders/<id>/restore`, `POST /documents/<id>/restore` |
| recycle bin | Delete forever folder / document (confirm) | `DELETE /folders/<id>/purge`, `DELETE /documents/<id>/purge` |
| permissions | Share with person (level) | `POST /permissions/<kind>/<id>/share` `{principal_type:'user', principal_id, level}` |
| permissions | Change a person's level (`data-autosubmit` select) | same as above |
| permissions | Remove access (confirm) | `DELETE /permissions/<kind>/<id>[/<n>]/entries/<entry_id>` |
| permissions | Stop / restore inheritance (confirm) | `PATCH /permissions/<kind>/<id>[/<n>]/inheritance` `{inherit, copy}` |
| permissions | Grant or change access (checkboxes) | `POST /permissions/<kind>/<id>[/<n>]/grant` `{principal_type, principal_id, permissions:[…]}` |
| emails / gmail | Sync now | `POST /gmail/sync` (synchronous; 200 `result.message`, 409 busy shown as info) |
| emails / gmail | Retry failed imports | `POST /gmail/retry` |
| email detail | Save attachment to library modal | `POST /documents/import-email-attachment` `{email_id, part_index, folder_id, idempotency_key}` |
| gmail | Connect / Reconnect | `GET /gmail/connect` → `window.location = authorization_url` |
| gmail | Disconnect (confirm) | `POST /gmail/disconnect` |
| account | Change password | `PATCH /account/password` `{current, new, new2}` |
| account | Turn off MFA | `DELETE /account/mfa` `{code}` |
| account | Create token | `POST /account/tokens` `{name, days}` (raw token shown once from the response) |
| account | Revoke token (confirm) | `DELETE /account/tokens/<id>` |
| account | Remove device | `DELETE /account/devices/<id>` |
| account/mfa | Turn on MFA | `POST /auth/mfa/setup` `{code}` → recovery codes from the response |
| auth/login | Sign in | `POST /auth/login` → 200 user / 202 `mfa_required` / 202 `mfa_setup_required` / 403 device code |
| auth/mfa | Verify | `POST /auth/mfa` `{code}` |
| auth/mfa | Cancel and sign out | `POST /auth/logout` |
| auth/register | Create account | `POST /auth/register` |
| auth/setup | Create administrator | `POST /auth/setup` |
| admin | Run maintenance / Rebuild search index | `POST /admin/maintenance`, `POST /admin/reindex` |
| admin users | Create / save user | `POST /admin/users`, `PATCH /admin/users/<id>` `{action:'save', …, roles:[…]}` |
| admin users | Reset MFA / Unlock | `PATCH /admin/users/<id>` `{action:'reset_mfa'}` / `{action:'unlock'}` |
| admin roles | Save role / Delete role | `POST /admin/roles`, `PATCH /admin/roles/<id>`, `DELETE /admin/roles/<id>` |
| admin settings | Save settings | `PATCH /admin/settings` (JSON; list fields sent as text, `blocked_platforms` as array) |
| admin metadata | Add type / Delete type (confirm) | `POST /admin/metadata/types`, `DELETE /admin/metadata/types/<id>` |
| admin metadata | Save / delete field | `POST /admin/metadata/fields`, `DELETE /admin/metadata/fields/<id>` |
| admin metadata | Save / delete vocabulary | `POST /admin/metadata/vocabularies`, `DELETE /admin/metadata/vocabularies/<id>` |
| admin metadata | Add tags / delete tag | `POST /admin/metadata/tags` `{names}`, `DELETE /admin/metadata/tags/<id>` |
| admin devices | Approve / Block / Remove | `PATCH /admin/devices/<id>` `{action}` |

Downloads are plain links: `/api/v1/documents/<id>/content[?version=n]`, `/api/v1/folders/<id>/download`,
`/api/v1/emails/<id>/eml`, `/api/v1/emails/<id>/attachments/<n>`.

## BRD coverage (Phase 1 functional requirements)

| ID | Where in the SPA |
|---|---|
| FR-FLD-01 create/rename/move/copy/delete folders | Browse page "More" menu, New folder modal, Rename/Move/Copy modals |
| FR-FLD-02 inheritance with override | Permissions page → Advanced → Inheritance |
| FR-FLD-03 naming rules | Enforced by the server; errors shown inline in the New folder / Rename modals; hint text kept |
| FR-FLD-04 breadcrumbs, favourites, recent, shortcuts | Breadcrumbs on browse/detail, `FavouriteButton`, `/favourites`, `/recent`, Add-shortcut modal and shortcut rows |
| FR-FLD-05 recycle bin | `/recycle-bin` (restore, delete forever, empty) and Delete actions everywhere |
| FR-DOC-01 single/multiple upload, drag-and-drop | Upload modal (`multiple`, dropzone, XHR progress, idempotency key) |
| FR-DOC-02 file types and size limits | Enforced by the server; Admin → Settings edits the lists and limits |
| FR-DOC-03 in-browser preview | Document detail preview (PDF, Office PDF/HTML rendition, image, video, audio, text) |
| FR-DOC-04 check-in / check-out | Document detail: Check out, Check in modal, Discard / Override check-out |
| FR-DOC-05 malware scanning | Server-side; upload errors shown inline; email malware notice |
| FR-VER-01..04 versions, major/minor, compare, restore | New version modal (major/minor + comment), version list, compare page (side-by-side / redline), restore |
| FR-VER-05 retention rules | Admin → Settings (global) and folder "Version retention" modal |
| FR-SRC-01..04 search | `/search` (syntax help, advanced filters, facets, sort, highlighted snippets), topbar suggestions |
| FR-MET-01/02 metadata, vocabularies, tags | Upload and Properties forms (`MetadataFields`), Admin → Metadata & tags |
| FR-SEC-01 RBAC roles | Admin → Roles |
| FR-SEC-02 permissions at repository/folder/document/version | Permissions page for all four kinds |
| FR-SEC-03 SSO, LDAP, MFA | Login page SSO buttons and LDAP hint, MFA challenge, MFA setup, account MFA |
| FR-SEC-04 encryption | Server-side; shown in Admin → Overview |
| FR-SEC-05 IP restriction, session timeout, device policy | Admin → Settings and Devices; `/device-pending`, `/blocked`; session-expiry 401 → `/login` |

## Libraries

| Library | Why |
|---|---|
| `react-router-dom` 7 | Routing (required by the task). |
| `@tanstack/react-query` 5 | Server state, caching, refetch after mutations, polling (required by the task). |
| `qrcode` | `GET /auth/mfa/setup` returns only `provisioning_uri`; the Jinja page showed a QR image rendered on the server (`mfa.qr_svg_data_uri`). The SPA has to draw the QR code itself to keep MFA enrolment usable from a phone. |

No UI kit, no CSS framework. `src/styles/app.css` is a verbatim copy of `DMS-BE/dms/static/css/app.css`.

## Gaps

Each gap says what the Jinja page has, what the SPA does today without a backend change, and the
smallest additive backend change that would close it. **No backend file has been changed.**

| # | Area | Missing from `/api/v1` | Interim behaviour in the SPA | Proposed backend change |
|---|---|---|---|---|
| G1 | `/me` | System capabilities (`has_cap`), `home_folder_id`, repository permissions (`root_can_edit`), `label`, `auth_source`, `mfa_enabled`, `app_name`, `max_upload_mb`, allowed extensions (`accept`). | Capabilities are inferred: `admin` from `GET /admin/status`, `audit` from `GET /activity?per_page=1` (200 vs 403). The `emails` capability no longer exists: every user has their own archive. `records` cannot be probed: it comes from the predefined role names (Admin, Records Manager) or `admin`, so a custom role with only `records` is not recognised (the server still enforces it). Root edit comes from `GET /folders/root` `permissions`. The home folder is the folder named after the user whose own breadcrumb trail is just "My Files" (`_crumbs` renames it for its owner); `/my-files` falls back to `/folders` if none is found. `app_name` comes from `VITE_APP_NAME`. | Add `capabilities`, `home_folder_id`, `repository_permissions`, `label`, `auth_source`, `mfa_enabled`, `app_name`, `max_upload_mb`, `accept` to `GET /me`. |
| G2 | Dashboard | `stats.storage`, `stats.trash`, recent documents, recently updated, checked out to me. | Lists are built from `GET /documents` (all pages). Trash count = items in `GET /recycle-bin`. Storage total is not shown. | Add these fields to `GET /dashboard`. |
| G3 | All Documents | `GET /documents` has no `q`, `type`, `tag`, `from`/`to`, `sort`/`dir`, `page`, `total`. | The SPA pages through `GET /documents` (`limit=1000`, `next_offset`) and filters, sorts and paginates in the browser. Slow for very large libraries. | Add those query parameters and `total` to `GET /documents` (same logic as `documents.index`). |
| G4 | Folder browse | Folder `inherit_permissions`, `is_system`, `version_keep_last/years`, document counts per folder, subfolder counts. | Tree built from `GET /folders`. Subfolder counts computed from it. Document counts are not shown. "Own permissions" marker not shown. Retention modal starts empty. Rename/Delete hidden for the My Files folder only (detected from breadcrumbs). | Add these fields to `_folder_json` (or to `GET /folders/<id>` only). |
| G5 | Document detail | Version `is_major`, `original_filename`, `scan_status`, `scan_engine`, author/creator labels (only usernames). | Shown without those fields. | Add them to `_version_json` / `_doc_json`. |
| G6 | Deleted document detail | `GET /documents/<id>` returns 404 for a document in the recycle bin (Jinja shows it with a Restore button). | Opening a deleted document shows the 404 page; restore works from the recycle bin. | Accept `include_deleted=1` on `GET /documents/<id>` for users who `can_manage_trashed`. |
| G7 | Text preview | Jinja inlines the first 512 KB. | SPA fetches `GET /documents/<id>/preview` as text and truncates at 512 KB. Works; listed only because the endpoint has no size cap. | Optional: `?max_bytes=` on preview. |
| G8 | Audit log | `GET /activity` has no `category` or `q` filter, no category list, no `ip`. | Category/search filters are applied to the loaded page only and the category list comes from the loaded events. | Add `category`, `q` and `categories` to `GET /activity`, and `ip` to each event. |
| G9 | Version history | `GET /versions` has no paging/total, no document extension, no "current" flag. | Shows the latest 200, extension taken from the document name, no "current" badge. | Add `page`, `per_page`, `total`, `extension`, `current`. |
| G10 | Permissions | Inheritance chain (inherited entries), owner, users' emails, the share levels the actor may give, target label. | Share levels and `level_of` are ported to the client. Only "Granted here" is shown. Owner shown only for documents (`author`). | Add `chain`, `owner`, `levels` to `GET /permissions/...` and `email` to `GET /directory`. |
| G11 | Email body | `GET /emails/<id>/body` returns JSON `{body_html}`, not a `text/html` page with `BODY_CSP`. Inline images (`/api/v1/emails/<id>/inline/<n>`) need the session cookie, which a sandboxed (opaque-origin) frame does not send. | The body is shown in an `<iframe srcdoc>` with the same `sandbox="allow-popups allow-popups-to-escape-sandbox"` and `referrerpolicy="no-referrer"`, plus a prepended CSP `<meta>` (same policy as `BODY_CSP`). Inline images are fetched from `/inline/<n>` by the page and substituted as `data:` URLs. The HTML never enters the page DOM (no `dangerouslySetInnerHTML`). | Add `GET /api/v1/emails/<id>/body.html` returning `text/html` with `BODY_CSP` (like `emails.body`). |
| G12 | Email detail | Account email, `message_id_header`, `source`, `state_updated_at`, `scan_detail`, `file_ok` (storage check). | Those rows are omitted; the .eml link is always shown. | Add them to `_email_json` (detail only). |
| G13 | Email index / Gmail page | Pending/failed import last error, list of failed items, OAuth `redirect_uri`. | Counts from `GET /gmail/status`; last error not shown; redirect URI computed as `<origin>/gmail/oauth2callback`. | Add `last_failed_error` and `redirect_uri` to the status payload. |
| G14 | Gmail / SSO callbacks | Flask `flash()` messages (success/failure) after the redirect back to the SPA are lost. | SPA shows a generic toast for `?auth_error=`; Gmail success is visible from the status. | Append `?message=`/`?error=` to the redirect URL when `DMS_ANGULAR_FRONTEND_URL` is set. |
| G15 | Account | `auth_source`, `last_login_at`, recovery codes left, current device id, device `user_agent`/`last_ip`. | Password form always shown (server rejects non-local accounts with a message). "This device" badge and the other fields not shown; Remove is offered for every device (server refuses the current one). | Add them to `GET /account`. |
| G16 | Admin overview | ClamAV/Defender detail, LibreOffice, OIDC provider list, TLS certificate. | Shows `malware_scanner`, LDAP, SAML, HTTPS, secure cookie only. | Add to `GET /admin/status`. |
| G17 | Admin users / devices | `locked_until`; device `user_agent`, `last_ip`; user labels in device list. | Locked badge and those columns not shown. | Add to `_user_json` and the device JSON. |
| G18 | Admin settings | Known (content-checked) type list, server maximum MB (`MAX_REQUEST_MB`). | Hint text omits them. | Add `known_types`, `server_max_mb` to `GET /admin/settings`. |
| G19 | Search | `title_html` (highlighted title); metadata field list for non-admins (filter "Metadata field"); full author list (`/directory` is capped at 50). | Plain title; field list from `GET /admin/metadata` for admins only (filter hidden otherwise). | Add `title_html` to results; expose `fields` on `GET /metadata/schema` or a new read-only list. |
| G20 | Recycle bin | Document count inside a deleted folder; version count of a deleted document. | Not shown. | Add `contents`/`version_count` to `GET /recycle-bin`. |
| G21 | Global search box | `/documents/search.json` (name match, folders + documents) has no API twin. | Closed without a backend change: the same name match (documents newest first, 8; folders, 5) runs on the cached `GET /documents` and `GET /folders` lists. | Optional `GET /api/v1/suggest?q=` for very large libraries. |
| G22 | Security-trimmed HTML | Search snippets and compare rows are server-built HTML (`<mark>`, `<ins>`, `<del>`). | Rendered by `components/SafeMarkup.jsx`: parsed with `DOMParser` into an inert document, only text and an allow-list of inline tags become React elements. | None needed. |

## Verification

Run on 2026-11-02 against DMS-BE with a throwaway database (`DMS_INSTANCE_DIR`/`DMS_STORAGE_DIR` in a temp folder), through the Vite proxy:

- `npm run build` and `npm run lint`: no errors, no warnings.
- API contract check (Node, cookie + CSRF like `client.js`): first-run setup, login, every endpoint and payload the pages use, including uploads with metadata, versions, compare, restore, check-out/in, shortcuts, recycle bin, share/grant/inheritance, roles, settings round-trip, search, downloads and the `csrf_failed` / `not_found` / `authentication_required` codes. All passed.
- UI check (headless Chrome): all 31 routes render; sign-in with `next`; My Files redirect; upload with progress, metadata and `?highlight`; inline form errors; Escape closes modals; rename selection; check-out/discard; new version; compare picks, side-by-side and redline; favourites; topbar suggestions and Enter; documents filters and sort in the URL; delete/restore; share level change; admin settings save; MFA QR; mobile sidebar; sign-out. 74 checks passed, no console errors.
- Not exercised: SSO (OIDC/SAML) and Gmail OAuth redirects (no identity provider or Google client in the test setup), MFA challenge at sign-in, device approval, and email pages with real messages.
