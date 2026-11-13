import { useMutation } from '@tanstack/react-query'
import { toast } from '../lib/toast'
import Icon from './Icon'
import { useModals } from './modals/modalContext'

/**
 * Port of `macro post_button`: runs `action` (a function returning a promise), optionally after a
 * ConfirmDialog. `success` is the flash message (string or function of the response).
 * Errors are toasted by the global mutation cache (main.jsx). Every query is refetched after success.
 */
export default function ActionButton({
  action, label = '', icon, className = 'btn btn-ghost btn-sm', confirm, title, success, onSuccess, disabled,
}) {
  const modals = useModals()
  const mutation = useMutation({
    mutationFn: action,
    onSuccess: (data) => {
      const message = typeof success === 'function' ? success(data) : success
      if (message) toast(message, 'success')
      if (onSuccess) onSuccess(data)
    },
  })
  const run = async () => {
    if (confirm && !(await modals.confirm(confirm))) return
    mutation.mutate()
  }
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run() }}>
      <button type="submit" className={className} title={title} aria-label={title} disabled={disabled || mutation.isPending}>
        {icon && <Icon name={icon} />}{label && ` ${label}`}
      </button>
    </form>
  )
}
