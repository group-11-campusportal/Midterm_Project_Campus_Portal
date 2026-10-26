import { useEffect } from 'react'
import StatusBadge from './StatusBadge'

function EnrollmentDetailModal({
  enrollment,
  student,
  course,
  onClose,
  onUpdateStatus,
}) {
  // Close the modal when the Escape key is pressed
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!enrollment) return null

  const isPending = enrollment.status === 'pending'
  const isApproved = enrollment.status === 'approved'
  const isRejected = enrollment.status === 'rejected'

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="modal-title" className="modal-title">
              Enrollment Request Details
            </h2>
            <span className="modal-subtitle">ID: {enrollment.id}</span>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </header>

        <div className="modal-body">
          {/* Status banner */}
          <div className="modal-banner">
            <div>
              <span className="modal-banner__label">Current Status</span>
              <div style={{ marginTop: '4px' }}>
                <StatusBadge status={enrollment.status} />
              </div>
            </div>
            <div>
              <span className="modal-banner__label">Submitted Date</span>
              <span className="modal-banner__value">{enrollment.enrolledAt}</span>
            </div>
            <div>
              <span className="modal-banner__label">Term</span>
              <span className="modal-banner__value">{enrollment.term}</span>
            </div>
          </div>

          {/* Student information */}
          <section className="modal-section">
            <h3 className="modal-section__title">Student Information</h3>
            <dl className="profile-list">
              <div>
                <dt>Full Name</dt>
                <dd>{enrollment.studentName}</dd>
              </div>
              <div>
                <dt>Student ID</dt>
                <dd>{enrollment.studentId}</dd>
              </div>
              <div>
                <dt>Program</dt>
                <dd>{student?.program || '—'}</dd>
              </div>
              <div>
                <dt>Year Level</dt>
                <dd>{student?.year ? `Year ${student.year}` : '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{student?.email || '—'}</dd>
              </div>
            </dl>
          </section>

          {/* Course information */}
          <section className="modal-section">
            <h3 className="modal-section__title">Course Information</h3>
            <dl className="profile-list">
              <div>
                <dt>Course Code</dt>
                <dd>{enrollment.courseCode}</dd>
              </div>
              <div>
                <dt>Course Title</dt>
                <dd>{enrollment.courseTitle}</dd>
              </div>
              <div>
                <dt>Credits</dt>
                <dd>{enrollment.credits} SKS</dd>
              </div>
              <div>
                <dt>Instructor</dt>
                <dd>{course?.instructor || '—'}</dd>
              </div>
              <div>
                <dt>Class Capacity</dt>
                <dd>
                  {course
                    ? `${course.enrolled} / ${course.capacity} students`
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Helpful context for the administrator */}
          {isApproved && (
            <p className="alert alert--success">
              ✓ This enrollment request has been approved. The student is now eligible to receive grades for this course.
            </p>
          )}

          {isRejected && (
            <p className="alert alert--error">
              ✕ This enrollment request was rejected. The student will not be able to attend or be graded for this course.
            </p>
          )}
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClose}
          >
            Close
          </button>

          {isPending ? (
            <>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => onUpdateStatus(enrollment.id, 'rejected')}
              >
                Reject Request
              </button>
              <button
                type="button"
                className="btn btn--success"
                onClick={() => onUpdateStatus(enrollment.id, 'approved')}
              >
                Approve Request
              </button>
            </>
          ) : isApproved ? (
            <button
              type="button"
              className="btn btn--danger-outline"
              onClick={() => onUpdateStatus(enrollment.id, 'rejected')}
            >
              Change to Rejected
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--success"
              onClick={() => onUpdateStatus(enrollment.id, 'approved')}
            >
              Re-approve Request
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

export default EnrollmentDetailModal
