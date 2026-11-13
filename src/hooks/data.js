// Shared react-query hooks for data many pages use.
import { useEffect, useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { allDocuments, metadataSchema } from '../api/documents'
import { listFavourites } from '../api/favourites'
import { listFolders } from '../api/folders'
import { APP_NAME } from '../auth/authContext'
import { buildTree } from '../lib/folders'

/** All visible folders (GET /folders) plus a depth-first tree and an id → folder map. */
export function useFolders() {
  const query = useQuery({ queryKey: ['folders'], queryFn: listFolders })
  const folders = query.data
  const derived = useMemo(() => {
    const list = folders || []
    return { folders: list, tree: buildTree(list), byId: new Map(list.map((f) => [f.id, f])) }
  }, [folders])
  return { ...query, ...derived }
}

/** Set of "folder:12" / "document:5" keys the user starred (replaces is_fav()). */
export function useFavourites() {
  const query = useQuery({ queryKey: ['favourites'], queryFn: listFavourites })
  const set = useMemo(() => new Set((query.data || []).map((f) => `${f.type}:${f.id}`)), [query.data])
  return { ...query, set }
}

/** Every visible document; /documents cannot filter or sort (MIGRATION.md G3). */
export function useAllDocuments(enabled = true) {
  return useQuery({ queryKey: ['documents', 'all'], queryFn: allDocuments, staleTime: 30_000, enabled })
}

/**
 * Fields, document types and tags for an upload or properties form (GET /metadata/schema),
 * the replacement for loadSchema() in app.js. Previous data is kept while a new folder/type loads.
 */
export function useMetadataSchema(folderId, documentTypeId, enabled = true) {
  return useQuery({
    queryKey: ['metadata-schema', String(folderId || ''), String(documentTypeId || '')],
    queryFn: () => metadataSchema(folderId, documentTypeId),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    meta: { silent: true }, // metadata is validated on the server as well
  })
}

/** "<Page> · <app_name>", like `{% block title %}` in base.html. */
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
