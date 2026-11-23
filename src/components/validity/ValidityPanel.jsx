import { Fragment, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  analyseValidity, confirmValidity, createException, documentValidity, evidenceUrl, setMonitoring, setSubscription,
  updateException, validityHistory, withdrawException,
} from '../../api/validity'
import { dt } from '../../lib/format'
import { toast } from '../../lib/toast'
import ActionButton from '../ActionButton'
import Icon from '../Icon'
import { VERIFICATION_LABELS } from '../../lib/validity'
import ValidityBadge from './ValidityBadge'

const JOB_LABELS = {
  queued: 'Queued for AI analysis', running: 'AI analysis running…', succeeded: 'AI analysis finished',
  failed: 'AI analysis failed', cancelled: 'AI analysis cancelled',
}
const SCOPE_LABELS = { port: 'Specific port', all: 'All applicable ports' }
const STATE_LABELS = { active: 'Active', paused: 'Paused', disabled: 'Disabled' }

const formObject = (form) => Object.fromEntries(new FormData(form).entries())
const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`)

function ConfirmForm({ docId, record, onDone }) {
  const [hasExpiry, setHasExpiry] = useState(record?.has_expiry !== false)
  const mutation = useMutation({
    mutationFn: (body) => confirmValidity(docId, body),
    meta: { inline: true },
    onSuccess: () => { toast('Validity details confirmed. Expiry monitoring applies from now on.', 'success'); onDone() },
  })
  const r = record || {}
  const text = (name, label, max) => (
    <div className="field"><label htmlFor={`v-${name}`}>{label}</label>
      <input type="text" id={`v-${name}`} name={name} maxLength={max} defaultValue={r[name] || ''} /></div>
  )
  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...formObject(e.currentTarget), has_expiry: hasExpiry }) }}>
      {text('document_type', 'Document type', 200)}
      {text('title', 'Title', 500)}
      {text('document_number', 'Document / reference number', 200)}
      {text('vessel_name', 'Vessel name', 200)}
      {text('issuing_authority', 'Issuing authority', 300)}
      <div className="field"><label htmlFor="v-issue">Issue date</label>
        <input type="date" id="v-issue" name="issue_date" defaultValue={r.issue_date || ''} /></div>
      <label className="check">
        <input type="checkbox" checked={hasExpiry} onChange={(e) => setHasExpiry(e.target.checked)} />
        This document has an expiry date
      </label>
      {hasExpiry && (
        <div className="field"><label htmlFor="v-expiry">Expiry date</label>
          <input type="date" id="v-expiry" name="expiry_date" required defaultValue={r.expiry_date || ''} /></div>
      )}
      {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}><Icon name="check" /> Confirm</button>
      </div>
    </form>
  )
}

function PauseForm({ docId, today, onDone }) {
  const mutation = useMutation({
    mutationFn: ({ until, reason }) => setMonitoring(docId, 'paused', until, reason),
    meta: { inline: true },
    onSuccess: () => { toast('Monitoring paused. It resumes automatically after the end date.', 'success'); onDone() },
  })
  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formObject(e.currentTarget)) }}>
      <div className="field"><label htmlFor="v-until">Pause until (last paused day)</label>
        <input type="date" id="v-until" name="until" required min={today} /></div>
      <div className="field"><label htmlFor="v-reason">Reason (optional)</label>
        <input type="text" id="v-reason" name="reason" maxLength={500} /></div>
      {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>Pause</button>
      </div>
    </form>
  )
}

function ExceptionForm({ docId, exception, today, onDone }) {
  const [scope, setScope] = useState(exception?.scope || 'port')
  const [endDate, setEndDate] = useState(exception?.end_date || '')
  const mutation = useMutation({
    mutationFn: (form) => (exception ? updateException(docId, exception.id, form) : createException(docId, form)),
    meta: { inline: true },
    onSuccess: () => { toast(exception ? 'Exception updated.' : 'Acceptance exception recorded.', 'success'); onDone() },
  })
  function submit(e) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const file = form.get('evidence')
    if (!file || !file.name) form.delete('evidence')
    if (scope !== 'port') form.set('port_name', '')
    mutation.mutate(form)
  }
  const ex = exception || {}
  return (
    <form onSubmit={submit} className="validity-exception-form">
      <p className="small muted">The document stays expired: its expiry date does not change. Expired-document
        alerts are suppressed while this acceptance applies and resume automatically when it ends or is withdrawn.</p>
      <div className="field"><label htmlFor="x-scope">Accepted by</label>
        <select id="x-scope" name="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="port">A specific port</option>
          <option value="all">All applicable ports</option>
        </select></div>
      {scope === 'port' && (
        <div className="field"><label htmlFor="x-port">Port</label>
          <input type="text" id="x-port" name="port_name" required maxLength={200} defaultValue={ex.port_name || ''} /></div>
      )}
      <div className="field"><label htmlFor="x-authority">Authority (optional)</label>
        <input type="text" id="x-authority" name="authority" maxLength={300} defaultValue={ex.authority || ''} /></div>
      <div className="field"><label htmlFor="x-ref">Reference number (optional)</label>
        <input type="text" id="x-ref" name="reference_number" maxLength={200} defaultValue={ex.reference_number || ''} /></div>
      <div className="field"><label htmlFor="x-reason">Reason for acceptance</label>
        <textarea id="x-reason" name="reason" rows={3} required minLength={5} defaultValue={ex.reason || ''} /></div>
      <div className="field"><label htmlFor="x-start">Acceptance start date</label>
        <input type="date" id="x-start" name="start_date" required defaultValue={ex.start_date || today} /></div>
      <div className="field"><label htmlFor="x-end">End / review date</label>
        <input type="date" id="x-end" name="end_date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <small className="muted">Leave empty only for an acceptance without an end date, and explain why below.</small></div>
      {!endDate && (
        <div className="field"><label htmlFor="x-why">Why has this acceptance no end date?</label>
          <textarea id="x-why" name="indefinite_justification" rows={2} required minLength={10}
            defaultValue={ex.indefinite_justification || ''} /></div>
      )}
      <div className="field"><label htmlFor="x-evidence">Supporting evidence (optional{exception?.evidence ? '; replaces the current file' : ''})</label>
        <input type="file" id="x-evidence" name="evidence" /></div>
      {mutation.error && <p className="form-error" role="alert">{mutation.error.message}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>{exception ? 'Save changes' : 'Record acceptance'}</button>
      </div>
    </form>
  )
}

function History({ docId }) {
  const query = useQuery({ queryKey: ['validity-history', docId], queryFn: () => validityHistory(docId) })
  if (query.isPending) return <p className="small muted">Loading…</p>
  if (query.isError) return <p className="small muted">The history could not be loaded.</p>
  if (!query.data.length) return <p className="small muted">No changes recorded yet.</p>
  return (
    <ul className="list compact">
      {query.data.map((e) => (
        <li key={e.id} className="list-row">
          <span className="list-main"><span className="small">{e.message}</span>
            <small className="muted">{e.user || 'System'} · {dt(e.created_at)}</small></span>
        </li>
      ))}
    </ul>
  )
}

/** "Validity" card on the document page: AI status, confirm/correct, monitoring controls, acceptance exceptions. */
export default function ValidityPanel({ docId }) {
  const [mode, setMode] = useState(null) // confirm | pause | exception | exception:<id>
  const [showHistory, setShowHistory] = useState(false)
  const query = useQuery({ queryKey: ['validity', docId], queryFn: () => documentValidity(docId) })
  const subscription = useMutation({ mutationFn: (on) => setSubscription(docId, on) })
  if (query.isPending) return null
  if (query.isError) return null // 404: the user may not see this document's validity data (admins included)

  const v = query.data
  const { record, summary, job, exceptions, analyses, can_edit: canEdit } = v
  const close = () => setMode(null)
  if (!record && !v.folder.monitoring) return null // never monitored: nothing to show

  const verified = record?.verification_status === 'verified' && !record?.stale
  const needsAction = record && ['requires_confirmation', 'needs_review'].includes(record.verification_status)
  const jobBusy = job && ['queued', 'running'].includes(job.status)
  const showJob = job && (jobBusy || job.status === 'failed' || (record?.stale && job.status !== 'succeeded'))

  return (
    <section className="card" id="validity">
      <div className="card-head">
        <h2>Validity</h2>
        <label className="check small" title="Receive this document's daily expiry alerts">
          <input type="checkbox" checked={!!v.subscribed} disabled={subscription.isPending}
            onChange={(e) => subscription.mutate(e.target.checked)} /> Follow alerts
        </label>
      </div>
      <p><ValidityBadge summary={summary} /></p>
      {!v.folder.monitoring && <p className="small muted">Monitoring is off for this document&apos;s folder; the data below is kept but no alerts are sent.</p>}

      {showJob && (
        <p className="small"><Icon name={job.status === 'failed' ? 'alert' : 'clock'} /> {JOB_LABELS[job.status]}
          {job.status === 'queued' && job.attempts > 0 && ` (attempt ${job.attempts + 1} of ${job.max_attempts})`}
          {job.last_error && <><br /><span className="muted">{job.last_error}</span></>}
          {jobBusy && !v.ai_configured && <><br /><span className="muted">AI analysis is not configured on this server; enter the dates by hand.</span></>}
        </p>
      )}
      {record?.stale && <p className="small muted">A new version was uploaded. Alerts are paused until its dates are confirmed.</p>}
      {record?.verification_status === 'needs_review' && record.review_reasons.length > 0 && (
        <ul className="small validity-reasons">{record.review_reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      )}

      {record && mode !== 'confirm' && (
        <dl className="meta">
          <dt>Status</dt><dd>{VERIFICATION_LABELS[record.verification_status] || record.verification_status}
            {record.source === 'ai' && record.confidence != null && ` · AI confidence ${pct(record.confidence)}`}</dd>
          {record.document_type && <><dt>Type</dt><dd>{record.document_type}</dd></>}
          {record.title && <><dt>Title</dt><dd className="break">{record.title}</dd></>}
          {record.document_number && <><dt>Number</dt><dd className="break">{record.document_number}</dd></>}
          {record.vessel_name && <><dt>Vessel</dt><dd>{record.vessel_name}</dd></>}
          {record.issuing_authority && <><dt>Authority</dt><dd>{record.issuing_authority}</dd></>}
          <dt>Issued</dt><dd>{record.issue_date || '—'}</dd>
          <dt>Expires</dt><dd>{record.has_expiry === false ? 'No expiry date' : record.expiry_date || '—'}
            {verified && summary.days_left != null && (
              <span className="muted"> ({summary.days_left >= 0 ? `${summary.days_left} day(s) left` : `${-summary.days_left} day(s) ago`})</span>)}</dd>
          {record.verified_by && <><dt>Confirmed</dt><dd>{record.verified_by} · {dt(record.verified_at)}{record.source === 'manual' && ' (corrected)'}</dd></>}
          <dt>Monitoring</dt><dd>{STATE_LABELS[record.monitoring_state]}
            {record.paused_until && ` until ${record.paused_until}`}{record.state_reason && ` — ${record.state_reason}`}</dd>
        </dl>
      )}
      {!record && <p className="small muted">This document has not been analysed yet.</p>}

      {mode === 'confirm' && <ConfirmForm docId={docId} record={record} onDone={close} />}
      {mode === 'pause' && <PauseForm docId={docId} today={v.today} onDone={close} />}

      {canEdit && !mode && (
        <div className="validity-actions">
          <button type="button" className={`btn btn-sm ${needsAction || !record ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('confirm')}>
            <Icon name="check" /> {needsAction ? 'Review & confirm' : verified ? 'Correct dates' : 'Enter dates'}
          </button>
          {v.folder.monitoring && v.ai_configured && !jobBusy && record?.monitoring_state !== 'disabled' && (
            <ActionButton action={() => analyseValidity(docId)} label="Analyse with AI" icon="refresh" className="btn btn-ghost btn-sm"
              confirm={record ? 'Run the AI analysis again for the current version? The extracted values will need to be confirmed again.' : undefined}
              success="Queued for AI analysis." />
          )}
          {record && record.monitoring_state === 'active' && (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('pause')}><Icon name="clock" /> Pause</button>
              <ActionButton action={() => setMonitoring(docId, 'disabled')} label="Disable" className="btn btn-ghost btn-sm"
                confirm="Stop expiry monitoring for this document until you resume it? All validity data is kept."
                success="Expiry monitoring disabled." />
            </>
          )}
          {record && record.monitoring_state !== 'active' && (
            <ActionButton action={() => setMonitoring(docId, 'active')} label="Resume monitoring" icon="restore"
              className="btn btn-secondary btn-sm" success="Expiry monitoring resumed." />
          )}
        </div>
      )}

      {(exceptions.length > 0 || (canEdit && verified && record?.expiry_date)) && (
        <div className="validity-section">
          <h3 className="small-head">Accepted after expiry</h3>
          {exceptions.length === 0 && <p className="small muted">No acceptance exceptions.</p>}
          <ul className="list compact">
            {exceptions.map((x) => (
              <Fragment key={x.id}>
                <li className="list-row">
                  <span className="list-main">
                    <span className="small"><strong>{x.scope === 'port' ? x.port_name : SCOPE_LABELS.all}</strong>
                      {' '}<span className={`badge ${x.applies_today ? 'badge-ok' : ''}`}>{x.applies_today ? 'Applies today' : x.state}</span></span>
                    <small className="muted">{x.start_date} → {x.end_date || 'no end date'}{x.reference_number && ` · Ref. ${x.reference_number}`}</small>
                    <small>{x.reason}</small>
                    {x.indefinite_justification && <small className="muted">No end date: {x.indefinite_justification}</small>}
                    <small className="muted">Recorded by {x.created_by || '—'} · {dt(x.created_at)}
                      {x.withdrawn_at && ` · withdrawn by ${x.withdrawn_by || '—'} ${dt(x.withdrawn_at)}`}</small>
                    {x.evidence && (v.can_download
                      ? <a className="small" href={evidenceUrl(docId, x.id)}><Icon name="paperclip" /> {x.evidence.filename}</a>
                      : <small className="muted"><Icon name="paperclip" /> {x.evidence.filename}</small>)}
                  </span>
                  {canEdit && x.status === 'active' && !mode && (
                    <span className="list-meta">
                      <button type="button" className="icon-btn" title="Edit" aria-label="Edit exception" onClick={() => setMode(`exception:${x.id}`)}><Icon name="edit" /></button>
                      <ActionButton action={() => withdrawException(docId, x.id)} icon="trash" className="icon-btn" title="Withdraw"
                        confirm="Withdraw this acceptance? Expired-document alerts resume from the next daily check. The record is kept."
                        success="Exception withdrawn." />
                    </span>
                  )}
                </li>
                {mode === `exception:${x.id}` && <li><ExceptionForm docId={docId} exception={x} today={v.today} onDone={close} /></li>}
              </Fragment>
            ))}
          </ul>
          {mode === 'exception' && <ExceptionForm docId={docId} today={v.today} onDone={close} />}
          {canEdit && verified && record?.expiry_date && !mode && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('exception')}>
              <Icon name="shield" /> This expired document is still accepted by the port/authority
            </button>
          )}
        </div>
      )}

      <details className="validity-section" onToggle={(e) => setShowHistory(e.currentTarget.open)}>
        <summary className="small"><Icon name="history" /> Validity history and AI analyses</summary>
        {showHistory && (
          <>
            <History docId={docId} />
            {analyses.length > 0 && (
              <ul className="list compact">
                {analyses.map((a) => (
                  <li key={a.id} className="list-row"><span className="list-main">
                    <span className="small">AI analysis of v{a.version || '?'}: {a.status}{a.confidence != null && ` · ${pct(a.confidence)}`}
                      {a.result?.expiry_date && ` · expiry ${a.result.expiry_date}`}</span>
                    <small className="muted">{dt(a.created_at)}{a.error && ` · ${a.error}`}</small>
                  </span></li>
                ))}
              </ul>
            )}
          </>
        )}
      </details>
    </section>
  )
}
