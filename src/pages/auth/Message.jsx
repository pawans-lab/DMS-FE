import { Link } from 'react-router-dom'
import { useTitle } from '../../hooks/data'

const MESSAGES = {
  pending: {
    title: 'Device waiting for approval',
    message: 'This device has not been approved yet. An administrator has been notified; try again once it has been approved.',
  },
  blocked: {
    title: 'Access not permitted',
    message: "Sign-in from this device or platform is not permitted by your organisation's policy.",
  },
}

/** auth/message.html for /device-pending and /blocked (routes/auth.py device_pending, blocked). */
export default function Message({ kind }) {
  const { title, message } = MESSAGES[kind]
  useTitle(title)
  return (
    <>
      <h1>{title}</h1>
      <p className="muted">{message}</p>
      <Link className="btn btn-secondary btn-block" to="/login">Back to sign in</Link>
    </>
  )
}
