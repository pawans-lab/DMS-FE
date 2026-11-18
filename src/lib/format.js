// Formatting helpers and constants ported from the backend, because /api/v1 does not expose them.
// Sources: dms/__init__.py (filesize, dt), dms/validation.py (TYPE_LABELS, preview kinds),
// dms/security/permissions.py and dms/services/access.py (labels, share levels).

/** Same output as the Jinja `filesize` filter. */
export function filesize(n) {
  let value = Number(n || 0)
  for (const unit of ['B', 'KB', 'MB', 'GB']) {
    if (value < 1024 || unit === 'GB') return unit === 'B' ? `${value.toFixed(0)} ${unit}` : `${value.toFixed(1)} ${unit}`
    value /= 1024
  }
  return ''
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n) => String(n).padStart(2, '0')

/**
 * Same output as the Jinja `dt` filter (UTC from the API, shown in local time).
 * Formats: 'full' = 05 Mar 2026, 14:03 · 'date' = 05 Mar 2026 · 'short' = 05 Mar, 14:03 · 'compact' = 05 Mar 2026 14:03
 */
export function dt(value, format = 'full') {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const day = pad(d.getDate())
  const mon = MONTHS[d.getMonth()]
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (format === 'date') return `${day} ${mon} ${d.getFullYear()}`
  if (format === 'short') return `${day} ${mon}, ${time}`
  if (format === 'compact') return `${day} ${mon} ${d.getFullYear()} ${time}`
  return `${day} ${mon} ${d.getFullYear()}, ${time}`
}

export const TYPE_LABELS = {
  pdf: 'PDF', doc: 'Word', docx: 'Word', odt: 'Document', rtf: 'Rich Text',
  xls: 'Excel', xlsx: 'Excel', ods: 'Spreadsheet', csv: 'CSV', tsv: 'CSV',
  ppt: 'PowerPoint', pptx: 'PowerPoint', odp: 'Presentation', odg: 'Drawing',
  msg: 'Outlook message', eml: 'Email', vsd: 'Visio', vsdx: 'Visio',
  txt: 'Text', md: 'Markdown', json: 'JSON', xml: 'XML', log: 'Text', yaml: 'YAML',
  yml: 'YAML', ini: 'Text', html: 'HTML', htm: 'HTML', svg: 'Image',
  png: 'Image', jpg: 'Image', jpeg: 'Image', gif: 'Image', webp: 'Image',
  bmp: 'Image', tif: 'Image', tiff: 'Image',
  dwg: 'CAD', dxf: 'CAD', dwf: 'CAD', step: 'CAD', stp: 'CAD', ifc: 'CAD',
  iges: 'CAD', igs: 'CAD', stl: 'CAD',
  mp3: 'Audio', wav: 'Audio', m4a: 'Audio', aac: 'Audio', ogg: 'Audio', oga: 'Audio',
  flac: 'Audio', wma: 'Audio',
  mp4: 'Video', m4v: 'Video', mov: 'Video', '3gp': 'Video', avi: 'Video', mkv: 'Video',
  webm: 'Video', wmv: 'Video', mpg: 'Video', mpeg: 'Video', ogv: 'Video',
  zip: 'Archive', '7z': 'Archive', rar: 'Archive', tar: 'Archive', gz: 'Archive',
  tgz: 'Archive', bz2: 'Archive',
}
export const TYPE_OPTIONS = [...new Set(Object.values(TYPE_LABELS))].sort()

/** Same output as the Jinja `typelabel` filter. */
export function typeLabel(ext) {
  const e = (ext || '').toLowerCase()
  return TYPE_LABELS[e] || (ext || 'File').toUpperCase()
}

export function extensionOf(name) {
  const i = (name || '').lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}

export const PERMS = ['view', 'download', 'edit', 'delete', 'share', 'manage']
export const PERM_LABELS = {
  view: 'View', download: 'Download', edit: 'Edit', delete: 'Delete', share: 'Share', manage: 'Manage permissions',
}
export const PERM_HELP = {
  view: 'See the item, its details and in-browser preview',
  download: 'Download original files and ZIP exports',
  edit: 'Upload, create subfolders, new versions, check out, edit tags and metadata (rename, move and delete stay with the owner)',
  delete: 'Move to the recycle bin',
  share: 'Give other users or roles view, download or edit access',
  manage: 'Change permissions and inheritance (implies all of the above)',
}
/** Labels for the capabilities GET /admin/roles lists in available_capabilities. */
export const CAP_LABELS = {
  admin: 'Administration (users, roles, settings; full access)',
  records: 'Records management (recycle bin, retention, check-out override)',
  audit: 'Audit (legacy; every user sees only their own activity log)',
}
/** Capabilities of the predefined roles (security/permissions.py PREDEFINED_ROLES). */
export const ROLE_CAPS = {
  Admin: ['admin', 'records', 'audit'],
  'Records Manager': ['records', 'audit'],
  Auditor: ['audit'],
}

/**
 * The three share levels of the Permissions Matrix (services/access.py SHARE_LEVELS), lowest first.
 * Rename, move, delete, restore version and resharing are never shared: they stay with the owner and Admin.
 */
export const SHARE_LEVELS = {
  view: ['Can view', ['view']],
  download: ['Can view & download', ['view', 'download']],
  edit: ['Can edit', ['view', 'download', 'edit']],
}
/** Labels for every level an existing grant may report, including older ones (access.py LEGACY_LEVELS). */
export const SHARE_LEVEL_LABELS = {
  view: 'Can view', download: 'Can view & download', edit: 'Can edit', upload: 'Can add files (legacy)',
}
/** Label of a share level key; unknown or empty levels read "Custom". */
export const shareLevelLabel = (level) => SHARE_LEVEL_LABELS[level] || 'Custom'

/** services/access.py level_of: the share level that describes what a grant gives a non-owner. */
export function levelOf(perms) {
  const set = new Set(perms || [])
  if (set.has('edit') || set.has('manage')) return 'edit'
  if (set.has('upload')) return 'upload'
  if (set.has('download')) return 'download'
  return set.has('view') ? 'view' : null
}

/**
 * Levels offered in the Share dialog as [key, label]: GET /directory share_levels when loaded,
 * otherwise the built-in three. Only view, download and edit are ever offered.
 */
export function shareLevelOptions(fromDirectory) {
  const list = fromDirectory?.length ? fromDirectory.map((l) => [l.key, l.label]) : Object.entries(SHARE_LEVELS).map(([k, [l]]) => [k, l])
  return list.filter(([key]) => key in SHARE_LEVELS)
}

/** GET /gmail/status status.status (and the admin mailbox list) → [label, badge class]. */
export const GMAIL_STATUS = {
  not_configured: ['Not set up', 'badge-warn'],
  not_connected: ['Not connected', ''],
  disconnected: ['Disconnected', ''],
  never: ['Waiting for first sync', 'badge-primary'],
  connected: ['Waiting for first sync', 'badge-primary'],
  ok: ['Connected', 'badge-ok'],
  busy: ['Syncing', 'badge-primary'],
  partial: ['Some imports failed', 'badge-warn'],
  error: ['Error, retrying', 'badge-danger'],
  network: ['Network error, retrying', 'badge-warn'],
  reauth_required: ['Reconnect required', 'badge-danger'],
}

export const EMAIL_STATE_LABELS = {
  archived: 'Archived', inbox: 'In Gmail Inbox', trashed: 'Trashed in Gmail', spam: 'Marked spam', deleted: 'Deleted in Gmail',
}

const IMAGE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
const TEXT = ['txt', 'csv', 'tsv', 'md', 'json', 'xml', 'log', 'yaml', 'yml', 'ini']
const VIDEO = ['mp4', 'm4v', 'webm', 'ogv', 'mov']
const AUDIO = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac']
const OFFICE = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf']

/** validation.py preview_kind (the detail endpoint also returns it). */
export function previewKind(ext) {
  if (ext === 'pdf') return 'pdf'
  if (IMAGE.includes(ext)) return 'image'
  if (TEXT.includes(ext)) return 'text'
  if (VIDEO.includes(ext)) return 'video'
  if (AUDIO.includes(ext)) return 'audio'
  if (OFFICE.includes(ext)) return 'office'
  return null
}

/** Client-side check for controlled tags (the server enforces it too). Returns an error message or ''. */
export function checkTags(value, tags, controlled) {
  if (!controlled) return ''
  const allowed = new Set(tags.map((t) => t.toLowerCase()))
  const bad = (value || '').split(',').map((t) => t.trim()).filter((t) => t && !allowed.has(t.toLowerCase()))
  return bad.length ? `These tags are not on the approved list: ${bad.join(', ')}.` : ''
}

export const plural =(n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`
export const initial = (s) => (s || '?').slice(0, 1).toUpperCase()

/** Only same-site paths, like _helpers.safe_next(). */
export function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/'
}

/** services/metadata.py FIELD_TYPES. */
export const FIELD_TYPES = { text: 'Text', number: 'Number', date: 'Date', choice: 'Choice (vocabulary)', boolean: 'Yes / No' }

/** A sync interval in seconds as "2 minutes" / "90 seconds". */
export function every(seconds) {
  if (!seconds || seconds % 60 !== 0) return `${seconds} seconds`
  const m = seconds / 60
  return `${m} minute${m === 1 ? '' : 's'}`
}
