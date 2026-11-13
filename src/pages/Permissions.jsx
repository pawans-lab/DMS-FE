import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'
import { directory, getDocument } from '../api/documents'
import { getFolder } from '../api/folders'
import { getPermissions, grant, removeEntry, setInheritance, share } from '../api/permissions'
import { useAuth } from '../auth/authContext'
import { useTitle } from '../hooks/data'
import ActionButton from '../components/ActionButton'
import Icon from '../components/Icon'
import Loading, { QueryError } from '../components/Loading'
import { useModals } from '../components/modals/modalContext'
import { PERMS, PERM_HELP, PERM_LABELS, SHARE_LEVELS, initial, levelOf, shareLevelsFor } from '../lib/format'
import { toast } from '../lib/toast'

/** Loads the folder/document behind a permissions page for its name, owner and parent. */
function useTarget(kind, id) {
  return useQuery({
    queryKey: [kind === 'folder' ? 'folder' : 'document', id],
    queryFn: () => (kind === 'folder' ? getFolder(id) : getDocument(id)),
    enabled: kind !== 'repository',
  })
}

function PersonRow({ entry, person, me, canManage, levels, onShare, kind, id }) {
  const level = levelOf(entry.permissions)
  const label = person?.label || entry.principal
  return (
    <li>
      <span className="avatar">{initial(label)}</span>
      <span className="list-main"><strong>{label}{entry.principal_id === me.id && ' (you)'}</strong><br />
        <small className="muted">{person?.username || ''}</small></span>
      {canManage && entry.principal_id !== me.id ? (
        <>
          <span className="inline-form">
            <select aria-label={`Access for ${label}`} value={level || ''} onChange={(e) => onShare(entry.principal_id, e.target.value, label)}>
              {!level && <option value="">Custom</option>}
              {levels.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </span>
          <ActionButton action={() => removeEntry(kind, id, null, entry.id)} label="Remove" className="btn btn-ghost btn-xs btn-danger-text"
            confirm={`Remove ${label}'s access?`} success="Access removed." />
        </>
      ) : <span className="badge">{level ? SHARE_LEVELS[level][0] : 'Custom'}</span>}
    </li>
  )
}

/** permissions.html for the repository, folders, documents and versions (FR-SEC-02, FR-FLD-02). */
export default function Permissions() {
  const { kind, id: rawId, number: rawNumber } = useParams()
  const id = Number(rawId)
  const number = rawNumber ? Number(rawNumber) : null
  const location = useLocation()
  const { user } = useAuth()
  const modals = useModals()
  const query = useQuery({ queryKey: ['permissions', kind, id, number], queryFn: () => getPermissions(kind, id, number) })
  const target = useTarget(kind, id)
  const dir = useQuery({ queryKey: ['directory', ''], queryFn: () => directory('') })
  const [shareTo, setShareTo] = useState('')
  const [shareLevel, setShareLevel] = useState('view')
  const [principal, setPrincipal] = useState('')
  const [checked, setChecked] = useState([])
  const shareMutation = useMutation({
    mutationFn: ({ pid, level }) => share(kind, id, number, pid, level),
    onSuccess: (_d, { level, label }) => toast(`Shared with ${label} (${SHARE_LEVELS[level][0]}).`, 'success'),
  })
  const grantMutation = useMutation({
    mutationFn: () => {
      const [ptype, pid] = principal.split(':')
      return grant(kind, id, number, ptype, Number(pid), checked)
    },
    onSuccess: () => { toast('Permissions updated.', 'success'); setChecked([]) },
  })
  const isShareKind = kind === 'folder' || kind === 'document'
  useTitle('Permissions')

  if (query.isPending || (kind !== 'repository' && target.isPending)) return <Loading />
  if (query.isError) return <QueryError error={query.error} />
  if (target.isError) return <QueryError error={target.error} />

  const data = query.data
  const myPerms = data.permissions
  const canManage = data.can_manage
  const canShare = myPerms.includes('share') || canManage
  const users = dir.data?.users || []
  const roles = dir.data?.roles || []
  const userById = new Map(users.map((u) => [u.id, u]))
  const levels = shareLevelsFor(myPerms)

  const folder = kind === 'folder' ? target.data.folder : null
  const doc = kind === 'document' || kind === 'version' ? target.data.document : null
  const version = kind === 'version' ? target.data.versions.find((v) => v.number === number) : null
  const back = kind === 'repository' ? '/folders' : kind === 'folder' ? `/folders/${id}`
    : kind === 'document' ? `/documents/${id}` : `/documents/${id}#versions`
  const subtitle = kind === 'folder' ? `Folder “${target.data.breadcrumbs.at(-1)?.name || folder.name}”`
    : kind === 'document' ? `“${doc.name}”`
      : kind === 'version' ? `Version ${version?.label || number} of '${doc.name}'` : 'Repository'
  const owner = kind === 'document' ? users.find((u) => u.username === doc.author) : null
  const people = data.entries.filter((e) => e.principal_type === 'user' && !(owner && e.principal_id === owner.id))
  const hasParent = folder ? folder.parent_id != null : doc ? doc.folder_id != null : false

  const onShare = (pid, level, label) => {
    if (level) shareMutation.mutate({ pid, level, label })
  }
  const toggle = (p) => setChecked((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]))
  const changeInheritance = async (inherit) => {
    const text = inherit
      ? "Restore inheritance? The parent's permissions apply again, in addition to those listed here."
      : 'Stop inheriting? The inherited permissions are copied here so nobody loses access; you can then remove or change them.'
    if (!(await modals.confirm(text))) return
    try {
      await setInheritance(kind, id, number, inherit, true)
      toast(inherit ? 'Inheritance restored: permissions now come from the parent.' : 'Inheritance stopped: only the permissions listed here apply.', 'success')
      query.refetch()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <>
      <nav className="breadcrumbs"><Link to={back}>← Back</Link></nav>
      <div className="page-head">
        <div><h1>{isShareKind ? 'Share' : 'Permissions'}</h1><p className="muted">{subtitle}</p></div>
      </div>

      {canShare && isShareKind && (
        <>
          <section className="card">
            <h2>Share with people</h2>
            <form className="share-form" onSubmit={(e) => {
              e.preventDefault()
              const person = userById.get(Number(shareTo))
              if (person) shareMutation.mutate({ pid: person.id, level: shareLevel, label: person.label })
            }}>
              <div className="field"><label htmlFor="share-person">Person</label>
                <select id="share-person" required value={shareTo} onChange={(e) => setShareTo(e.target.value)}>
                  <option value="">Choose a person…</option>
                  {users.filter((u) => u.id !== user.id).map((u) => <option key={u.id} value={u.id}>{u.label} · {u.username}</option>)}
                </select></div>
              <div className="field"><label htmlFor="share-level">Access</label>
                <select id="share-level" value={shareLevel} onChange={(e) => setShareLevel(e.target.value)}>
                  {levels.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></div>
              <button className="btn btn-primary" type="submit" disabled={shareMutation.isPending}><Icon name="share" /> Share</button>
            </form>
            <p className="small muted">Can view: open and preview · Can view &amp; download: also download · Can edit: also upload, rename and add new versions{kind === 'folder' && ' inside this folder'} · Full control: also delete and share. The level you choose here is exactly what this person gets{kind === 'folder' ? ' in this folder' : ''}, even if their role would allow more; you can lower it at any time.</p>
          </section>

          <section className="card">
            <h2>Who has access</h2>
            <ul className="people-list">
              {owner && (
                <li><span className="avatar">{initial(owner.label)}</span>
                  <span className="list-main"><strong>{owner.label}{owner.id === user.id && ' (you)'}</strong><br /><small className="muted">{owner.username}</small></span>
                  <span className="badge">Owner</span></li>
              )}
              {people.map((e) => (
                <PersonRow key={e.id} entry={e} person={userById.get(e.principal_id)} me={user} canManage={canManage}
                  levels={levels} onShare={onShare} kind={kind} id={id} />
              ))}
            </ul>
            {!people.length && !owner && <p className="muted">Not shared with anyone individually.</p>}
            {data.inherit_permissions
              ? <p className="small muted">People who have access to the {hasParent ? 'parent folder' : 'shared library'} can also open this {kind}.</p>
              : <p className="small muted"><Icon name="lock" /> Private: only the people listed here (and administrators) can open this {kind}.</p>}
          </section>
        </>
      )}

      {canManage ? (
        <details className="advanced" id="advanced" open={!isShareKind || location.hash === '#advanced'}>
          <summary>Advanced permissions (roles, inheritance, individual permissions)</summary>
          {kind !== 'repository' && (
            <section className="card">
              <h2>Inheritance</h2>
              {data.inherit_permissions ? (
                <>
                  <p><Icon name="layers" /> This item <strong>inherits</strong> permissions from its parent. Role grants below add to them; access given to a person directly on this item replaces what they would inherit.</p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => changeInheritance(false)}>Stop inheriting (override here)</button>
                </>
              ) : (
                <>
                  <p><Icon name="lock" /> Inheritance is <strong>stopped</strong>: only the permissions listed below apply to this item and the items inside it.</p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => changeInheritance(true)}>Inherit from parent again</button>
                </>
              )}
            </section>
          )}

          <section className="card card-flush">
            <div className="card-head pad"><h2>Granted here</h2></div>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>User or role</th>{PERMS.map((p) => <th key={p} className="hide-sm">{PERM_LABELS[p]}</th>)}<th className="actions-col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.entries.length ? data.entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.principal}</td>
                    {PERMS.map((p) => <td key={p} className="hide-sm">{e.permissions.includes(p) || e.permissions.includes('manage') ? '✓' : ''}</td>)}
                    <td className="actions-col">
                      <ActionButton action={() => removeEntry(kind, id, number, e.id)} label="Remove" className="btn btn-ghost btn-xs btn-danger-text"
                        confirm="Remove this access?" success="Access removed." />
                    </td>
                  </tr>
                )) : <tr><td colSpan={PERMS.length + 2} className="muted">Nothing granted here.</td></tr>}
              </tbody>
            </table></div>
          </section>

          <section className="card">
            <h2>Grant or change access</h2>
            <form onSubmit={(e) => { e.preventDefault(); grantMutation.mutate() }}>
              <div className="field"><label htmlFor="principal">User or role</label>
                <select id="principal" required value={principal} onChange={(e) => setPrincipal(e.target.value)}>
                  <option value="" disabled>Choose…</option>
                  <optgroup label="Roles">{roles.map((r) => <option key={r.id} value={`role:${r.id}`}>{r.name}</option>)}</optgroup>
                  <optgroup label="Users">{users.map((u) => <option key={u.id} value={`user:${u.id}`}>{u.label} ({u.username})</option>)}</optgroup>
                </select></div>
              <fieldset className="field"><label>Permissions (replaces this user&apos;s or role&apos;s grant here; none = remove)</label>
                {PERMS.map((p) => (
                  <label key={p} className="check"><input type="checkbox" checked={checked.includes(p)} onChange={() => toggle(p)} /> {PERM_LABELS[p]} <small className="muted">{PERM_HELP[p]}</small></label>
                ))}
              </fieldset>
              <button className="btn btn-primary" type="submit" disabled={grantMutation.isPending}>Save access</button>
            </form>
          </section>
        </details>
      ) : !canShare && (
        <section className="card"><p className="muted">You can see this item but cannot change who has access to it.</p></section>
      )}
    </>
  )
}

