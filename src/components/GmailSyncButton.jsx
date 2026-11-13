import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { gmailSync } from '../api/gmail'
import { refreshData } from '../lib/query'
import { toast } from '../lib/toast'
import Icon from './Icon'

/**
 * "Sync now": POST /gmail/sync runs the synchronization of the user's own mailbox and returns its result
 * (it can take several seconds). A 409 without the not_connected code means a sync is already running.
 */
export default function GmailSyncButton({ className = 'btn btn-secondary', disabled }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  async function sync() {
    setBusy(true)
    try {
      const data = await gmailSync()
      toast(data.result?.message ? `Synchronization finished: ${data.result.message}.` : 'Synchronization finished.', 'success')
    } catch (err) {
      if (err.status === 409 && err.code !== 'not_connected') toast(err.message, 'info')
      else toast(err.message, 'error')
    }
    setBusy(false)
    refreshData(queryClient)
  }

  return (
    <span className="inline-form">
      <button type="button" className={className} onClick={sync} disabled={disabled || busy} aria-busy={busy}>
        <Icon name="refresh" /> {busy ? 'Syncing…' : 'Sync now'}
      </button>
    </span>
  )
}
