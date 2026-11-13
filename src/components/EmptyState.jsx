import Icon from './Icon'

/** Port of `macro empty(title, text, icon_name)` in _macros.html. */
export default function EmptyState({ title, text = '', icon = 'file', children }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name={icon} /></div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  )
}
