import { useMutation } from '@tanstack/react-query'
import { gmailConnect } from '../api/gmail'
import Icon from './Icon'

/**
 * Connect / Reconnect Gmail: GET /gmail/connect returns Google's URL and the browser goes there (full page).
 * Google sends the browser back with ?gmail=connected|error&message=… (handled in AuthProvider).
 * Errors such as 409 not_configured are toasted by the global mutation cache.
 */
export default function GmailConnectButton({ label = 'Connect Gmail', className = 'btn btn-primary', disabled }) {
  const mutation = useMutation({
    mutationFn: gmailConnect,
    onSuccess: (data) => { window.location.href = data.authorization_url },
  })
  return (
    <button type="button" className={className} onClick={() => mutation.mutate()} disabled={disabled || mutation.isPending || mutation.isSuccess}>
      <Icon name="mail" /> {label}
    </button>
  )
}
