import Icon from './Icon'

/** Shown on folders and documents under a legal hold: nobody can delete, purge or move them. */
export default function LegalHoldBadge({ item, hold }) {
  if (!(hold ?? item?.legal_hold)) return null
  return (
    <span className="badge badge-danger" title="Legal hold: this item cannot be deleted, purged or moved until an administrator releases the hold.">
      <Icon name="shield" /> Legal hold
    </span>
  )
}
