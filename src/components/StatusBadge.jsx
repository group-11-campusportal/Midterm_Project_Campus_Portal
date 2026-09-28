// Small coloured pill for an enrollment status.
function StatusBadge({ status }) {
  const safeStatus = status || 'pending'
  return <span className={`badge badge--${safeStatus}`}>{safeStatus}</span>
}

export default StatusBadge
