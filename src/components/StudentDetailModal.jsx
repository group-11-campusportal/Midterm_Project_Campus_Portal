import { useEffect, useRef, useState } from 'react'
import StatusBadge from './StatusBadge'

/**
 * Detail modal a student opens from "My Enrollments", "My Academic Grades" or "My Submissions".
 * `record` is an enrollment row or a grade row from the API. `courses` and `grades` are optional:
 * when given, the modal adds the instructor, the seat count and the recorded grade.
 * Uses the same modal-card styles as the administrator's EnrollmentDetailModal.
 */
function StudentDetailModal({ record, onClose, courses = [], grades = [], onWithdraw }) {
  const closeBtnRef = useRef(null)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!record) return undefined
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

  const isGradeRow = record.letter != null && record.enrollmentId != null
  const course = courses.find((item) => item.id === record.courseId)
  const grade = isGradeRow ? record : grades.find((item) => item.enrollmentId === record.id)
  // A grade exists only for an approved enrollment, so a grade row is approved by definition.
  const status = record.status || (isGradeRow ? 'approved' : null)
  // Only the student's own pending request can be withdrawn (the server enforces the same rule).
  const canWithdraw = Boolean(onWithdraw) && !isGradeRow && status === 'pending'

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <span className="code-pill">{record.courseCode}</span>
            <h2 id="student-modal-title" className="modal-title" style={{ marginTop: '6px' }}>
              {record.courseTitle}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close record details"
          >
            &times;
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-banner">
            <div>
              <span className="modal-banner__label">Status</span>
              <div style={{ marginTop: '4px' }}>
                {status ? <StatusBadge status={status} /> : '—'}
              </div>
            </div>
            <div>
              <span className="modal-banner__label">Term</span>
              <span className="modal-banner__value">{record.term || '—'}</span>
            </div>
            <div>
              <span className="modal-banner__label">Credits</span>
              <span className="modal-banner__value">{record.credits ? `${record.credits} SKS` : '—'}</span>
            </div>
          </div>

          <section className="modal-section">
            <h3 className="modal-section__title">Course Information</h3>
            <dl className="profile-list">
              <div>
                <dt>Course</dt>
                <dd>{record.courseCode} · {record.courseTitle}</dd>
              </div>
              <div>
                <dt>Instructor</dt>
                <dd>{course?.instructor || '—'}</dd>
              </div>
              <div>
                <dt>Seats (approved)</dt>
                <dd>{course ? `${course.enrolled} / ${course.capacity}` : '—'}</dd>
              </div>
              {record.enrolledAt ? (
                <div>
                  <dt>Submitted</dt>
                  <dd>{record.enrolledAt}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="modal-section">
            <h3 className="modal-section__title">Grade</h3>
            {grade ? (
              <dl className="profile-list">
                <div>
                  <dt>Letter grade</dt>
                  <dd style={{ color: 'var(--color-primary)' }}>{grade.letter}</dd>
                </div>
                <div>
                  <dt>Raw score</dt>
                  <dd>{grade.score} / 100</dd>
                </div>
                <div>
                  <dt>Grade points</dt>
                  <dd>{Number(grade.points).toFixed(1)} pts</dd>
                </div>
              </dl>
            ) : (
              <p className="table__muted" style={{ margin: 0, fontSize: '13px' }}>
                {status === 'approved'
                  ? 'No grade has been recorded for this course yet.'
                  : status === 'pending'
                    ? 'Waiting for the registrar to approve this request. Grades are recorded after approval.'
                    : 'This request was rejected, so no grade will be recorded.'}
              </p>
            )}
          </section>
        </div>

        {withdrawError ? (
          <p className="alert alert--error" role="alert" style={{ margin: '0 24px 12px' }}>{withdrawError}</p>
        ) : null}
        {confirmWithdraw ? (
          <p className="alert alert--error" style={{ margin: '0 24px 12px' }}>
            Withdraw your request for {record.courseCode}? You can request it again later.
          </p>
        ) : null}

        <footer className="modal-footer" style={canWithdraw ? { justifyContent: 'space-between' } : undefined}>
          {canWithdraw ? (
            confirmWithdraw ? (
              <button type="button" className="btn btn--danger" disabled={busy} onClick={async () => {
                setBusy(true)
                setWithdrawError('')
                try {
                  await onWithdraw(record.id)
                  onClose()
                } catch (failure) {
                  setWithdrawError(failure.message || 'The request could not be withdrawn. Try again.')
                } finally {
                  setBusy(false)
                }
              }}>
                {busy ? 'Withdrawing…' : 'Yes, withdraw request'}
              </button>
            ) : (
              <button type="button" className="btn btn--ghost" style={{ color: 'var(--color-danger)' }} onClick={() => setConfirmWithdraw(true)}>
                Withdraw request
              </button>
            )
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            {confirmWithdraw ? 'Keep request' : 'Close'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default StudentDetailModal
