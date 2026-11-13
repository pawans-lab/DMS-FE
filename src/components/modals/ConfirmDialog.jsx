import Modal from '../Modal'

/** The confirm-modal from base.html: destructive wording gets a red "Yes, continue" button. */
export default function ConfirmDialog({ text, title = 'Are you sure?', onConfirm, onClose }) {
  const danger = /delete|trash|disconnect|permanent/i.test(text)
  return (
    <Modal title={title} onClose={onClose} small role="alertdialog" closeButton={false}>
      <p className="muted">{text}</p>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} data-confirm-ok
          onClick={onConfirm}>
          {danger ? 'Yes, continue' : 'Confirm'}
        </button>
      </div>
    </Modal>
  )
}
