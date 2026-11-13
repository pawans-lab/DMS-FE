import { useMutation } from '@tanstack/react-query'
import { addFavourite, removeFavourite } from '../api/favourites'
import { useFavourites } from '../hooks/data'
import { toast } from '../lib/toast'
import Icon from './Icon'

/** Port of `macro fav_button`: PUT/DELETE /api/v1/favourites/<kind>/<id>. */
export default function FavouriteButton({ kind, id }) {
  const { set } = useFavourites()
  const on = set.has(`${kind}:${id}`)
  const mutation = useMutation({
    mutationFn: () => (on ? removeFavourite(kind, id) : addFavourite(kind, id)),
    onSuccess: () => toast(on ? 'Removed from favourites.' : 'Added to favourites.', 'success'),
  })
  const title = on ? 'Remove from favourites' : 'Add to favourites'
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <button type="submit" className={`icon-btn star-btn${on ? ' is-starred' : ''}`} title={title} aria-label={title}
        aria-pressed={on} disabled={mutation.isPending}>
        <Icon name={on ? 'star-fill' : 'star'} />
      </button>
    </form>
  )
}
