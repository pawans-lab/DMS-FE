import { useEffect, useId, useRef } from 'react'

/**
 * The `.modal` shell from base.html. Escape and a click on the backdrop close it, focus moves to the
 * first field on open and returns to the opener on close (app.js openModal/closeModal).
 */
export default function Modal({ title, onClose, small = false, role = 'dialog', closeButton = true, children }) {
  const labelId = useId()
  const cardRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  useEffect(() => {
    const opener = document.activeElement
    const first = cardRef.current?.querySelector(
      'input[type=text], input[type=password], select, input[type=file], button[data-confirm-ok]',
    )
    const timer = setTimeout(() => first?.focus(), 30)
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current?.() }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      if (opener && opener.focus) opener.focus()
    }
  }, [])

  return (
    <div className="modal" role={role} aria-modal="true" aria-labelledby={labelId}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal-card${small ? ' modal-sm' : ''}`} ref={cardRef}>
        <div className="modal-head">
          <h2 id={labelId}>{title}</h2>
          {closeButton && <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">&times;</button>}
        </div>
        {children}
      </div>
    </div>
  )
}
