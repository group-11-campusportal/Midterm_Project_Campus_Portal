import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { computeGpa } from '../utils/grade'

// Student "My Grades" page. Same layout as the mobile Grades tab
// (mobile-app/src/app/(tabs)/grades.js): hero with GPA / graded courses / graded credits,
// a "My Grades" / "Approved Courses" switch, the cumulative GPA card and one card per course.
function StudentGradesView({ user, enrollments, grades, successMessage, onSelectEnrollment }) {
  const [activeTab, setActiveTab] = useState('grades') // 'grades' | 'courses'

  // Newest first, like the mobile list.
  const myGrades = useMemo(
    () => grades.filter((g) => g.studentId === user.studentId).reverse(),
    [grades, user.studentId],
  )
  const approvedCourses = useMemo(
    () => enrollments.filter((e) => e.studentId === user.studentId && e.status === 'approved'),
    [enrollments, user.studentId],
  )

  const gradedCount = myGrades.length
  const totalCredits = myGrades.reduce((sum, g) => sum + (g.credits || 0), 0)
  const gpa = computeGpa(myGrades)
  const gpaDisplay = gpa > 0 ? gpa.toFixed(2) : '—'
  const terms = [...new Set(myGrades.map((g) => g.term))].sort().join(', ')
  const showCourses = activeTab === 'courses'

  const stats = [
    { label: 'GPA (4.0 scale)', value: gpaDisplay },
    { label: 'Graded courses', value: String(gradedCount) },
    { label: 'Graded credits', value: `${totalCredits} SKS` },
  ]

  return (
    <>
      <section className="hero-card">
        <div className="hero-card__deco1" />
        <div className="hero-card__deco2" />
        <div className="hero-card__content">
          <div className="hero-card__top">
            <span className="hero-badge sg-eyebrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                <path d="M22 10 12 5 2 10l10 5 10-5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              My Academic Records
            </span>
          </div>
          <h1 className="hero-title" style={{ fontSize: '26px' }}>My Academic Grades</h1>
          <p className="hero-subtitle">Recorded letter grades and course credit points.</p>

          <div className="sg-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="sg-stat">
                <span className="sg-stat__value">{stat.value}</span>
                <span className="sg-stat__label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {successMessage ? (
        <p className="alert alert--success" role="status" style={{ marginTop: '16px' }}>
          {successMessage} <Link to="/form">See your pending requests</Link>
        </p>
      ) : null}

      <div className="sg-toggle" role="tablist" aria-label="Grades or approved courses">
        <button
          type="button"
          role="tab"
          aria-selected={!showCourses}
          className={`sg-toggle__tab ${!showCourses ? 'sg-toggle__tab--active' : ''}`}
          onClick={() => setActiveTab('grades')}
        >
          <span className="sg-toggle__title">My Grades</span>
          <span className="sg-toggle__caption">{gradedCount} recorded</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={showCourses}
          className={`sg-toggle__tab ${showCourses ? 'sg-toggle__tab--active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          <span className="sg-toggle__title">Approved Courses</span>
          <span className="sg-toggle__caption">{approvedCourses.length} approved</span>
        </button>
      </div>

      {!showCourses && gradedCount > 0 ? (
        <GpaCard gpa={gpa} totalCredits={totalCredits} count={gradedCount} terms={terms} />
      ) : null}

      <h2 className="sg-section-title">
        {showCourses ? 'Approved courses' : 'Course grades'}
        <span className="sg-section-count">
          {showCourses ? approvedCourses.length : gradedCount} records
        </span>
      </h2>

      <div className="sg-list">
        {showCourses ? (
          approvedCourses.length === 0 ? (
            <EmptyCard title="No approved courses yet" message="Courses approved by the registrar will appear here." />
          ) : (
            approvedCourses.map((e) => (
              <button
                key={e.id}
                type="button"
                className="sg-card sg-card--clickable"
                onClick={() => onSelectEnrollment(e)}
                aria-label={`View details for ${e.courseCode} ${e.courseTitle}`}
              >
                <div className="sg-card__main">
                  <div className="sg-card__code-row">
                    <span className="sg-code">{e.courseCode}</span>
                  </div>
                  <span className="sg-card__title">{e.courseTitle}</span>
                  <span className="sg-card__sub">Term {e.term} · {e.credits} SKS</span>
                  <span className="sg-card__meta">Requested on {e.enrolledAt ?? '—'}</span>
                </div>
                <StatusBadge status={e.status} />
              </button>
            ))
          )
        ) : gradedCount === 0 ? (
          <EmptyCard title="No grades recorded yet" message="Grades recorded for your approved enrollments will appear here." />
        ) : (
          myGrades.map((g) => (
            <div key={g.id} className="sg-card">
              <div className="sg-card__main">
                <div className="sg-card__code-row">
                  <span className="sg-code">{g.courseCode}</span>
                  <span className="sg-card__term">Term {g.term}</span>
                </div>
                <span className="sg-card__title">{g.courseTitle}</span>
                <span className="sg-card__sub">
                  Score <strong>{g.score}</strong> / 100 · {g.credits} SKS
                </span>
              </div>
              <div className="sg-letter">
                <span className="sg-letter__value">{g.letter ?? '—'}</span>
                {g.points != null ? (
                  <span className="sg-letter__pts">{Number(g.points).toFixed(1)} pts</span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function GpaCard({ gpa, totalCredits, count, terms }) {
  const standing =
    gpa >= 3.5 ? "Dean's List · First Class Standing"
      : gpa >= 3.0 ? 'Good Academic Standing'
        : 'Satisfactory Standing'
  return (
    <div className="sg-gpa">
      <div className="sg-gpa__left">
        <span className="sg-gpa__label">Cumulative GPA</span>
        <span className="sg-card__sub">
          Credit-weighted, {count} course{count === 1 ? '' : 's'} · {totalCredits} SKS
        </span>
        <span className="sg-standing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
            <circle cx="12" cy="8" r="6" />
            <path d="M15.5 13 17 22l-5-3-5 3 1.5-9" />
          </svg>
          {standing}
        </span>
        {terms ? <span className="sg-card__term">Term {terms}</span> : null}
      </div>
      <div className="sg-gpa__right">
        <span className="sg-gpa__value">{gpa.toFixed(2)}</span>
        <span className="sg-card__term">out of 4.00</span>
      </div>
    </div>
  )
}

function EmptyCard({ title, message }) {
  return (
    <div className="sg-empty">
      <p className="sg-empty__title">{title}</p>
      <p className="sg-empty__text">{message}</p>
    </div>
  )
}

export default StudentGradesView
