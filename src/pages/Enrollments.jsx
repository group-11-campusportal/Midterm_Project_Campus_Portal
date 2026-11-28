import { useMemo, useState } from 'react'
import StatusBadge from '../components/StatusBadge'

const FILTERS = ['All', 'Approved', 'Pending', 'Rejected']

// "today", "1 day ago", "12 days ago" from an ISO date (YYYY-MM-DD).
function age(dateText) {
  const then = Date.parse(`${dateText}T00:00:00`)
  if (Number.isNaN(then)) return ''
  const days = Math.max(0, Math.floor((Date.now() - then) / 86400000))
  return days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`
}

// Administrator "University Enrollments" page. Same layout as the mobile Enrollments tab
// (mobile-app/src/app/(tabs)/enrollments.js): decision banner, status filters, one card per request
// with seat count and Approve / Reject. Each decision asks once inline. An approval can be undone
// (changed to rejected) only while the enrollment has no grade; a rejected student may request again.
function Enrollments({ enrollments, courses, grades = [], onUpdateEnrollmentStatus }) {
  const [activeFilter, setActiveFilter] = useState('All')
  const [confirming, setConfirming] = useState(null) // { id, status }
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])
  const gradedIds = useMemo(() => new Set(grades.map((g) => g.enrollmentId)), [grades])

  const countFor = (filter) =>
    filter === 'All' ? enrollments.length : enrollments.filter((e) => e.status === filter.toLowerCase()).length

  // Pending first (the ones that need a decision), then newest first.
  const rows = useMemo(() => {
    const list = activeFilter === 'All'
      ? enrollments
      : enrollments.filter((e) => e.status === activeFilter.toLowerCase())
    const byDate = (a, b) => String(b.enrolledAt).localeCompare(String(a.enrolledAt))
    return [...list].sort(
      (a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || byDate(a, b),
    )
  }, [enrollments, activeFilter])

  const pending = enrollments.filter((e) => e.status === 'pending')
  const oldestPending = pending.map((e) => e.enrolledAt).sort()[0] ?? ''

  async function decide(item, status) {
    setBusyId(item.id)
    setError('')
    setNotice('')
    try {
      await onUpdateEnrollmentStatus(item.id, status)
      setNotice(`${status === 'approved' ? 'Approved' : 'Rejected'}: ${item.studentName} · ${item.courseCode} ${item.courseTitle}.`)
      setConfirming(null)
    } catch (failure) {
      setError(failure.message || 'Could not update the request. Try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <section className="hero-card hero-card--admin">
        <div className="hero-card__deco1" />
        <div className="hero-card__deco2" />
        <div className="hero-card__content">
          <div className="hero-card__top">
            <span className="hero-badge sg-eyebrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                <rect x="6" y="4" width="12" height="17" rx="2" />
                <path d="M9 4V3h6v1" />
              </svg>
              Enrollment Center
            </span>
          </div>
          <h1 className="hero-title" style={{ fontSize: '26px' }}>University Enrollments</h1>
          <p className="hero-subtitle">Review student enrollment requests and course quotas.</p>
        </div>
      </section>

      {pending.length > 0 ? (
        <button type="button" className="en-decision" onClick={() => setActiveFilter('Pending')}>
          <span className="en-decision__icon" aria-hidden="true">!</span>
          <span>
            <strong className="en-decision__title">
              {pending.length} {pending.length === 1 ? 'request needs' : 'requests need'} your decision
            </strong>
            <span className="en-decision__sub">
              Oldest waiting since {oldestPending}. Click to show only pending.
            </span>
          </span>
        </button>
      ) : null}

      <div className="en-filters" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={activeFilter === f}
            className={`en-chip ${activeFilter === f ? 'en-chip--active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
            <span className="en-chip__count">{countFor(f)}</span>
          </button>
        ))}
      </div>

      {notice ? <p className="alert alert--success" role="status">{notice}</p> : null}
      {error ? <p className="alert alert--error" role="alert">{error}</p> : null}

      {rows.length === 0 ? (
        <div className="sg-empty">
          <p className="sg-empty__title">No {activeFilter.toLowerCase()} enrollments</p>
          <p className="sg-empty__text">Enrollment requests submitted by students will appear here.</p>
        </div>
      ) : (
        <div className="en-list">
          {rows.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              course={courseById.get(item.courseId)}
              graded={gradedIds.has(item.id)}
              busy={busyId === item.id}
              confirming={confirming?.id === item.id ? confirming.status : null}
              onAsk={(status) => { setError(''); setConfirming({ id: item.id, status }) }}
              onCancel={() => setConfirming(null)}
              onConfirm={(status) => decide(item, status)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function RequestCard({ item, course, graded, busy, confirming, onAsk, onCancel, onConfirm }) {
  const isPending = item.status === 'pending'
  const canUndo = item.status === 'approved' && !graded
  const seatsLeft = course ? Math.max(0, course.capacity - course.enrolled) : null
  const kind = isPending ? 'NEW REQUEST' : item.status === 'approved' ? 'APPROVED' : 'REJECTED'
  const sentence = isPending ? 'wants to enroll in ' : item.status === 'approved' ? 'is enrolled in ' : 'was refused for '

  return (
    <article className={`en-card ${isPending ? 'en-card--pending' : ''}`}>
      <div className="en-card__top">
        <span className={`en-card__kind ${isPending ? 'en-card__kind--pending' : ''}`}>{kind}</span>
        <StatusBadge status={item.status} />
      </div>
      <h2 className="en-card__student">{item.studentName}</h2>
      <span className="en-card__id">Student ID {item.studentId}</span>
      <p className="en-card__sentence">
        {sentence}
        <span className="en-card__course">{item.courseCode} · {item.courseTitle}</span>
      </p>
      <ul className="en-card__facts">
        <li>Submitted {item.enrolledAt} ({age(item.enrolledAt)})</li>
        <li>{item.credits} SKS · Term {item.term}</li>
        {course ? (
          <li className={seatsLeft === 0 ? 'en-card__full' : ''}>
            {seatsLeft === 0
              ? 'Class is full — approving will fail'
              : `${seatsLeft} seats left (${course.enrolled}/${course.capacity} approved)`}
          </li>
        ) : null}
      </ul>

      {isPending || canUndo ? (
        confirming ? (
          <div className="en-confirm">
            <span>
              {!isPending
                ? 'Undo this approval? The seat is freed and the request becomes rejected.'
                : confirming === 'approved'
                  ? 'Approve this request?'
                  : 'Reject this request? The student can request this course again later.'}
            </span>
            <div className="en-actions">
              <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
              <button
                type="button"
                className={`en-btn ${confirming === 'approved' ? 'en-btn--approve' : 'en-btn--reject'}`}
                onClick={() => onConfirm(confirming)}
                disabled={busy}
              >
                {busy ? 'Saving…' : `Yes, ${!isPending ? 'undo' : confirming === 'approved' ? 'approve' : 'reject'}`}
              </button>
            </div>
          </div>
        ) : !isPending ? (
          <div className="en-actions">
            <button type="button" className="en-btn en-btn--reject" onClick={() => onAsk('rejected')} disabled={busy}>
              Undo approval
            </button>
          </div>
        ) : (
          <div className="en-actions en-actions--split">
            <button type="button" className="en-btn en-btn--reject" onClick={() => onAsk('rejected')} disabled={busy}>
              Reject
            </button>
            <button
              type="button"
              className="en-btn en-btn--approve"
              onClick={() => onAsk('approved')}
              disabled={busy || seatsLeft === 0}
            >
              Approve
            </button>
          </div>
        )
      ) : null}
    </article>
  )
}

export default Enrollments
