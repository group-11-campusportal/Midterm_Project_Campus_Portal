// Small coloured pill for an enrollment status with icon.
function StatusBadge({ status }) {
  const safeStatus = status || 'pending'

  return (
    <span className={`badge badge--${safeStatus}`}>
      {safeStatus === 'approved' && (
        <svg
          className="badge__icon"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 10l4 4 8-8" />
        </svg>
      )}
      {safeStatus === 'pending' && (
        <svg
          className="badge__icon"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l2.5 1.5" />
        </svg>
      )}
      {safeStatus === 'rejected' && (
        <svg
          className="badge__icon"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 6l8 8M14 6l-8 8" />
        </svg>
      )}
      <span>{safeStatus}</span>
    </span>
  )
}

export default StatusBadge
