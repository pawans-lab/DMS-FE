import { api } from './client'

export const listFavourites = () => api('/favourites').then((d) => d.favourites)
export const addFavourite = (kind, id) => api(`/favourites/${kind}/${id}`, { method: 'PUT' })
export const removeFavourite = (kind, id) => api(`/favourites/${kind}/${id}`, { method: 'DELETE' })
