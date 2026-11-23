import { validityChip } from '../../lib/validity'
import Icon from '../Icon'

/** Status chip plus a second chip when monitoring is paused or switched off. */
export default function ValidityBadge({ summary, showState = true }) {
  const chip = validityChip(summary)
  if (!chip) return null
  const state = summary.monitoring_state
  return (
    <>
      <span className={`badge ${chip.cls}`.trim()}><Icon name={chip.icon} /> {chip.text}</span>
      {showState && state === 'paused' && (
        <> <span className="badge"><Icon name="clock" /> Paused until {summary.paused_until}</span></>
      )}
      {showState && state === 'disabled' && <> <span className="badge">Monitoring off</span></>}
    </>
  )
}
