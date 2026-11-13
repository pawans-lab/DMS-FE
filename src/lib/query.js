// Refetch everything that may have changed after a write (the Jinja pages reloaded after every POST).
// Session-level lookups (capabilities, home folder) are left alone.
const KEEP = new Set(['caps', 'home', 'me'])

export function refreshData(queryClient) {
  return queryClient.invalidateQueries({ predicate: (q) => !KEEP.has(q.queryKey[0]) })
}
