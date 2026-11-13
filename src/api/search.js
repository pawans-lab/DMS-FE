import { api } from './client'

export const search = (params) => api('/search', { query: params })
