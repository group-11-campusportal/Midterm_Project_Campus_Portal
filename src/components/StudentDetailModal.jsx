import { useEffect, useRef } from 'react'

/**
 * Accessible detail modal for Students to inspect their enrollment,
 * course information, instructor, submission date, and official grade.
 */
function StudentDetailModal({ record, onClose }) {
  const modalRef = useRef(null)
  const closeBtnRef = useRef(null)

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (!record) return

    closeBtnRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [record, onClose])

  if (!record) return null

  function getStatusBadge(status) {
    if (status === 'approved') return <span className="badge badge--success">Approved</span>
    if (status === 'rejected') return <span className="badge badge--danger">Rejected</span>
    return <span className="badge badge--warning">Pending</span>
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-modal-title"
      >
        <div className="modal__header">
          <div>
            <span className="modal__code">{record.courseCode}</span>
            <h2 id="student-modal-title" className="modal__title">
              {record.courseTitle}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="modal__close-btn"
            onClick={onClose}
            aria-label="Close record details"
          >
            ✕
          </button>
        </div>

        <div className="modal__body">
          <dl className="modal__details-grid">
            <div>
              <dt>Academic Term</dt>
              <dd>{record.term || '2024/2025'}</dd>
            </div>
            <div>
              <dt>Credit Weight</dt>
              <dd>{record.credits ? `${record.credits} SKS` : '—'}</dd>
            </div>
            <div>
              <dt>Registration Status</dt>
              <dd>{getStatusBadge(record.status)}</dd>
            </div>
            <div>
              <dt>Date Submitted</dt>
              <dd>{record.enrolledAt || '—'}</dd>
            </div>
            {record.instructor && (
              <div>
                <dt>Course Instructor</dt>
                <dd>{record.instructor}</dd>
              </div>
            )}
            {record.grade && (
              <div>
                <dt>Recorded Grade</dt>
                <dd style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                  {record.grade.letter} ({record.grade.score} / 100 · {record.grade.points} pts)
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="modal__footer">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}

export default StudentDetailModal
