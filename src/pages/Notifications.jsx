import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  listNotifications, notificationPreferences, readAllNotifications, readNotification, setNotificationPreferences,
} from '../api/validity'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import Loading, { QueryError } from '../components/Loading'
import { useTitle } from '../hooks/data'
import { dt } from '../lib/format'
import { toast } from '../lib/toast'

const EMAIL_MODES = {
  off: 'Off: in-app notifications only',
  milestones: 'Milestones: one email on days with 30, 15, 7, 3 and 1 day(s) left, on the expiry day, then weekly while expired',
  daily: 'Daily: one summary email every day there are alerts',
}

function EmailPreferences() {
  const prefs = useQuery({ queryKey: ['notifications', 'prefs'], queryFn: notificationPreferences })
  const save = useMutation({
    mutationFn: setNotificationPreferences,
    onSuccess: () => toast('Email preference saved.', 'success'),
  })
  if (prefs.isPending || prefs.isError) return null
  const p = prefs.data
  return (
    <section className="card">
      <h2>Email</h2>
      {!p.email_available && <p className="small muted">Email is not configured on this server, so alerts are shown here only.</p>}
      {p.email_available && !p.has_email && <p className="small muted">Your account has no email address, so no emails can be sent.</p>}
      <div className="field">
        <label htmlFor="email-mode">Validity alert emails</label>
        <select id="email-mode" value={p.email_mode} disabled={save.isPending}
          onChange={(e) => save.mutate(e.target.value)}>
          {p.modes.map((m) => <option key={m} value={m}>{EMAIL_MODES[m] || m}</option>)}
        </select>
        <small className="muted">In-app notifications always count down daily. Emails are combined into one per day.</small>
      </div>
    </section>
  )
}

/** Notification centre: every notification of the signed-in user, and email preferences. */
export default function Notifications() {
  useTitle('Notifications')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [limit, setLimit] = useState(50)
  const query = useQuery({
    queryKey: ['notifications', 'page', unreadOnly, limit],
    queryFn: () => listNotifications({ unread: unreadOnly ? 1 : '', limit }),
  })
  const read = useMutation({ mutationFn: readNotification })
  const readAll = useMutation({ mutationFn: readAllNotifications, onSuccess: () => toast('All notifications marked as read.', 'success') })

  return (
    <>
      <div className="page-head">
        <div><h1>Notifications</h1><p className="muted">Document validity alerts for documents you own or follow.</p></div>
        <div className="actions">
          <label className="check"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Unread only</label>
          <button type="button" className="btn btn-secondary" disabled={readAll.isPending || !query.data?.unread} onClick={() => readAll.mutate()}>
            <Icon name="check" /> Mark all read
          </button>
        </div>
      </div>
      <div className="detail-grid">
        <section className="card card-flush">
          {query.isPending ? <Loading /> : query.isError ? <QueryError error={query.error} /> : query.data.notifications.length ? (
            <ul className="list notif-page">
              {query.data.notifications.map((n) => (
                <li key={n.id} className={`list-row pad${n.read ? '' : ' is-unread'}`}>
                  <span className={`notif-dot sev-${n.severity}`} aria-hidden="true" />
                  <span className="list-main">
                    {n.link ? <Link to={n.link} onClick={() => !n.read && read.mutate(n.id)}>{n.title}</Link> : <span>{n.title}</span>}
                    <small className="muted">{n.message}</small>
                    <small className="muted">{dt(n.created_at)}</small>
                  </span>
                  {!n.read && (
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => read.mutate(n.id)}>Mark read</button>
                  )}
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No notifications" icon="bell" text="Expiry alerts for documents you own or follow appear here." />}
          {query.data?.next_offset != null && (
            <div className="pad"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setLimit(limit + 50)}>Show more</button></div>
          )}
        </section>
        <aside className="side-col"><EmailPreferences /></aside>
      </div>
    </>
  )
}
