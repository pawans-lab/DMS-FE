// Server-built highlight markup (search snippets with <mark>, compare rows with <ins>/<del>) is
// already escaped by the backend, but it is still rendered without dangerouslySetInnerHTML:
// DOMParser builds an inert document (no scripts run) and only text plus an allow-list of
// inline tags is turned into React elements. Everything else becomes plain text.
const ALLOWED = new Set(['MARK', 'INS', 'DEL', 'B', 'STRONG', 'EM', 'I'])

function convert(node, key) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const children = Array.from(node.childNodes).map((child, i) => convert(child, `${key}.${i}`))
  if (ALLOWED.has(node.tagName)) {
    const Tag = node.tagName.toLowerCase()
    return <Tag key={key}>{children}</Tag>
  }
  return children
}

export default function SafeMarkup({ html }) {
  if (!html) return null
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  return <>{Array.from(doc.body.childNodes).map((node, i) => convert(node, String(i)))}</>
}
