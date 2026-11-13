import { EMAIL_STATE_LABELS } from '../lib/format'

/** Port of `macro state_badge(state)` in _macros.html. */
export default function EmailStateBadge({ state }) {
  return <span className={`badge badge-state-${state}`}>{EMAIL_STATE_LABELS[state] || state}</span>
}
