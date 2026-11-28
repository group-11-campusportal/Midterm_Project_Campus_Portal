import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import StudentDetailModal from '../components/StudentDetailModal'
import { newestTerm } from '../utils/terms'

const ENROLLMENT_FILTERS = ['All', 'Approved', 'Pending', 'Rejected']
const CATALOG_FILTERS = ['All', 'Open', 'Full', 'Closed', 'Requested']

// The term of an enrollment comes from the course offering, so the form keeps only the course.
const emptyEnrollmentForm = { courseId: '' }

const blockLabels = {
  pending: 'Request pending', approved: 'Already enrolled', closed: 'Closed', full: 'Class Full',
}
const blockMessages = {
  missing: 'This course is no longer in the catalog. Refresh the page.',
  pending: 'You already have a pending request for this course.',
  approved: 'You are already enrolled in this course.',
  closed: 'This course is closed for enrollment.',
  full: 'This course is already full.',
}

// Student "Enroll in Course" page. Administrators never reach it: /form redirects them to /output,
// where grades are recorded with RecordGradeModal.
function FormPage({
  user,
  courses,
  enrollments,
  grades,
  onAddEnrollment,
  onWithdrawEnrollment,
}) {
  const navigate = useNavigate()

  const [enrollmentForm, setEnrollmentForm] = useState(emptyEnrollmentForm)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [enrollmentFilter, setEnrollmentFilter] = useState('All')
  const [catalogFilter, setCatalogFilter] = useState('All')
  const [selectedRecord, setSelectedRecord] = useState(null)

  const currentTerm = newestTerm(courses)

  function handleEnrollmentChange(event) {
    const { name, value } = event.target
    setEnrollmentForm((previous) => ({ ...previous, [name]: value }))
    setErrors({})
    setSubmitError('')
  }

  function selectCourse(courseId) {
    setEnrollmentForm((prev) => ({ ...prev, courseId }))
    setErrors({})
    setSubmitError('')
  }

  function validateEnrollment() {
    const nextErrors = {}

    if (!enrollmentForm.courseId) {
      nextErrors.courseId = 'Select a course.'
      setErrors(nextErrors)
      return false
    }

    const course = courses.find((item) => item.id === enrollmentForm.courseId)
    const block = course ? requestBlock(course) : 'missing'
    if (block) nextErrors.courseId = blockMessages[block]

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleEnrollmentSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    if (!validateEnrollment()) {
      return
    }
    setIsSubmitting(true)
    try {
      const course = courses.find((item) => item.id === enrollmentForm.courseId)
      await onAddEnrollment(course.id)
      navigate('/output', {
        state: {
          success: `Enrollment request for ${course.code} — ${course.title} was submitted and is pending approval.`,
        },
      })
    } catch (error) {
      setSubmitError(
        error.message ||
          'Unable to submit enrollment request. Check your connection and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Selected course object for real-time preview
  const selectedCourseId = enrollmentForm.courseId
  const selectedCourse = courses.find((c) => c.id === selectedCourseId)

  // Filtered course catalog
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses
    const q = searchQuery.toLowerCase().trim()
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.instructor?.toLowerCase().includes(q),
    )
  }, [courses, searchQuery])

  // Student side: the API already returns only this student's enrollments.
  const myEnrollments = useMemo(
    () => enrollments.filter((e) => e.studentId === user.studentId),
    [enrollments, user.studentId],
  )
  const myStatusByCourse = useMemo(() => {
    const map = new Map()
    for (const enrollment of myEnrollments) map.set(enrollment.courseId, enrollment.status)
    return map
  }, [myEnrollments])
  const filteredMyEnrollments = useMemo(() => {
    const rows = enrollmentFilter === 'All'
      ? myEnrollments
      : myEnrollments.filter((e) => (e.status || '').toLowerCase() === enrollmentFilter.toLowerCase())
    return [...rows].sort((a, b) => String(b.enrolledAt).localeCompare(String(a.enrolledAt)))
  }, [myEnrollments, enrollmentFilter])
  const approvedCredits = myEnrollments
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + (e.credits || 0), 0)

  // Why a course cannot be requested right now, or null. A rejected request may be made again.
  function requestBlock(course) {
    const status = myStatusByCourse.get(course.id)
    if (status === 'pending' || status === 'approved') return status
    if (course.isOpen === false) return 'closed'
    if (course.enrolled >= course.capacity) return 'full'
    return null
  }

  // Approved courses are listed in "My Enrollments", so the catalog leaves them out.
  // Order: open courses first, then pending, then full and closed ones.
  function catalogState(course) {
    const block = requestBlock(course)
    if (block === 'approved') return 'approved'
    if (block === 'pending') return 'requested'
    return block || 'open'
  }
  function catalogRank(course) {
    const state = catalogState(course)
    return state === 'open' ? 0 : state === 'requested' ? 1 : 2
  }
  const catalogBase = filteredCourses
    .filter((c) => catalogState(c) !== 'approved')
    .sort((a, b) => catalogRank(a) - catalogRank(b) || a.code.localeCompare(b.code))
  const approvedInCatalog = filteredCourses.length - catalogBase.length
  const catalogCounts = {
    All: catalogBase.length,
    Open: catalogBase.filter((c) => catalogState(c) === 'open').length,
    Full: catalogBase.filter((c) => catalogState(c) === 'full').length,
    Closed: catalogBase.filter((c) => catalogState(c) === 'closed').length,
    Requested: catalogBase.filter((c) => catalogState(c) === 'requested').length,
  }
  const visibleCatalog = catalogFilter === 'All'
    ? catalogBase
    : catalogBase.filter((c) => catalogState(c) === catalogFilter.toLowerCase())

  const myEnrollmentColumns = [
    {
      key: 'course',
      label: 'Course',
      render: (row) => (
        <>
          <span className="table__strong">{row.courseCode}</span>
          <span className="table__muted">{row.courseTitle}</span>
        </>
      ),
    },
    { key: 'credits', label: 'SKS' },
    { key: 'enrolledAt', label: 'Submitted' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ]

  return (
    <>
      {/* Modern Royal Navy Hero Header */}
      <section className="hero-card">
        <div className="hero-card__deco1" />
        <div className="hero-card__deco2" />

        <div className="hero-card__content">
          <div className="hero-card__top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="hero-badge">
                Course Enrollment
              </span>
              {currentTerm ? <span className="term-tag">Term {currentTerm}</span> : null}
            </div>
            <div className="hero-quick-pill">
              <span className="hero-quick-pill__item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
                {/* No credit limit exists in the API, so show the real approved total instead. */}
                <span>{approvedCredits} SKS approved</span>
              </span>
              <div className="hero-quick-pill__divider" />
              <span className="hero-quick-pill__item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Live Period</span>
              </span>
            </div>
          </div>

          <h1 className="hero-title" style={{ fontSize: '26px' }}>
            Course Enrollment Center
          </h1>
          <p className="hero-subtitle">
            Select courses from the university catalog and send a request to the registrar.
          </p>
        </div>
      </section>

      {submitError ? (
        <p className="alert alert--error" role="alert" style={{ marginTop: '16px' }}>
          {submitError}
        </p>
      ) : null}

      {/* Modern 2-Column Responsive Enrollment Layout */}
      <div className="enrollment-layout">
        {/* Left Column: The Form Card */}
        <section className="card">
          <div className="section-head">
            <div>
              <h2 className="section-head__title">
                Enrollment Application
              </h2>
              <p className="table__muted" style={{ fontSize: '13px', marginTop: '2px' }}>
                Submit course registration for semester verification.
              </p>
            </div>
          </div>

            <form onSubmit={handleEnrollmentSubmit} noValidate style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="field">
                  <label htmlFor="enrollCourseId">Target Course</label>
                  <select
                    id="enrollCourseId"
                    name="courseId"
                    value={enrollmentForm.courseId}
                    onChange={handleEnrollmentChange}
                  >
                    <option value="">Choose a course or click below…</option>
                    {courses.map((course) => {
                      const block = requestBlock(course)
                      const wasRejected = myStatusByCourse.get(course.id) === 'rejected'
                      return (
                        <option
                          key={course.id}
                          value={course.id}
                          disabled={Boolean(block)}
                        >
                          {course.code} — {course.title} · {course.term} ({course.credits} SKS)
                          {block ? ` — ${blockLabels[block]}` : wasRejected ? ' — Rejected before, can request again' : ''}
                        </option>
                      )
                    })}
                  </select>
                  {errors.courseId ? (
                    <span className="field__error">{errors.courseId}</span>
                  ) : null}
                </div>

                {/* Real-Time Course Selection Preview Card */}
                {selectedCourse ? (
                  <div className="course-preview-card">
                    <div className="course-preview-header">
                      <span className="course-preview-code">{selectedCourse.code}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {selectedCourse.credits} SKS Credits
                      </span>
                    </div>
                    <div className="course-preview-title">{selectedCourse.title}</div>
                    <div className="course-preview-meta">
                      <span className="course-preview-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>{selectedCourse.instructor}</span>
                      </span>
                      <span className="course-preview-meta-item">
                        <span>Term {selectedCourse.term}</span>
                      </span>
                    </div>
                    <div className="capacity-meter-wrap">
                      <div className="capacity-meter-labels">
                        <span>Class Seats</span>
                        <span>{selectedCourse.enrolled} / {selectedCourse.capacity} occupied</span>
                      </div>
                      <div className="capacity-track">
                        <div
                          className="capacity-bar-fill"
                          style={{
                            width: `${Math.min(100, Math.round((selectedCourse.enrolled / selectedCourse.capacity) * 100))}%`,
                            background:
                              selectedCourse.enrolled >= selectedCourse.capacity
                                ? 'var(--color-danger)'
                                : selectedCourse.enrolled / selectedCourse.capacity > 0.8
                                ? 'var(--color-warning)'
                                : 'var(--color-primary)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="field">
                  <label htmlFor="enrollTerm">Academic Term</label>
                  {/* The term belongs to the course offering; the student cannot pick another one. */}
                  <input
                    id="enrollTerm"
                    readOnly
                    value={selectedCourse ? selectedCourse.term : 'Set by the course you choose'}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn--primary"
                disabled={isSubmitting}
                style={{ width: '100%', marginTop: '20px' }}
              >
                {isSubmitting ? (
                  'Submitting Application…'
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Submit Enrollment Request</span>
                  </>
                )}
              </button>
            </form>
        </section>

        <section className="card">
            <div className="section-head">
              <div>
                <h2 className="section-head__title">My Enrollments</h2>
                <p className="table__muted" style={{ fontSize: '13px', marginTop: '2px' }}>
                  Every request you submitted and the registrar decision. Click a row for details.
                </p>
              </div>
              <span className="section-head__count">{approvedCredits} SKS approved</span>
            </div>

            <div className="filter-bar">
              {ENROLLMENT_FILTERS.map((filter) => {
                const count = filter === 'All'
                  ? myEnrollments.length
                  : myEnrollments.filter((e) => (e.status || '').toLowerCase() === filter.toLowerCase()).length
                return (
                  <button
                    key={filter}
                    type="button"
                    className={`filter-chip ${enrollmentFilter === filter ? 'filter-chip--active' : ''}`}
                    onClick={() => setEnrollmentFilter(filter)}
                  >
                    <span>{filter}</span>
                    <span className="filter-chip__badge">{count}</span>
                  </button>
                )
              })}
            </div>

            <DataTable
              columns={myEnrollmentColumns}
              rows={filteredMyEnrollments}
              onRowClick={(row) => setSelectedRecord(row)}
              emptyTitle={enrollmentFilter === 'All' ? 'No enrollment requests yet' : `No ${enrollmentFilter.toLowerCase()} requests`}
              emptyMessage="Pick a course from the catalog below and submit the form."
            />
          </section>
      </div>

      <section className="card card--spaced">
          <div className="section-head">
            <div>
              <h2 className="section-head__title">Course Catalog &amp; Capacity</h2>
              <p className="table__muted" style={{ fontSize: '13px', marginTop: '2px' }}>
                Courses you can still request, open ones first. Seats count approved enrollments only; a pending request does not hold a seat.
              </p>
            </div>
            <span className="section-head__count">{visibleCatalog.length} {visibleCatalog.length === 1 ? 'offering' : 'offerings'}</span>
          </div>

          <div className="catalog-toolbar">
            <div className="catalog-search-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true" style={{ color: 'var(--color-text-muted)' }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by code, title, or instructor…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search courses"
              />
            </div>
            <div className="filter-bar catalog-toolbar__filters">
              {CATALOG_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`filter-chip ${catalogFilter === filter ? 'filter-chip--active' : ''}`}
                  onClick={() => setCatalogFilter(filter)}
                >
                  <span>{filter === 'Requested' ? 'My requests' : filter}</span>
                  <span className="filter-chip__badge">{catalogCounts[filter]}</span>
                </button>
              ))}
            </div>
          </div>

          {approvedInCatalog > 0 ? (
            <p className="catalog-approved-note">
              {approvedInCatalog} approved {approvedInCatalog === 1 ? 'course is' : 'courses are'} not shown here; see My Enrollments above.
            </p>
          ) : null}

          {visibleCatalog.length === 0 ? (
            <p className="catalog-empty">
              {searchQuery ? `No courses match "${searchQuery}".` : 'Nothing to show here. Every course already has a request from you.'}
            </p>
          ) : (
            <div className="catalog-grid">
              {visibleCatalog.map((c) => {
                const pct = Math.min(100, Math.round((c.enrolled / c.capacity) * 100))
                const seatsLeft = Math.max(0, c.capacity - c.enrolled)
                const state = catalogState(c)
                const status = myStatusByCourse.get(c.id)
                const isSelected = selectedCourseId === c.id
                return (
                  <article
                    key={c.id}
                    className={`catalog-card ${isSelected ? 'catalog-card--selected' : ''} ${state === 'full' || state === 'closed' ? 'catalog-card--full' : ''}`}
                  >
                    <div className="catalog-card__top">
                      <span className="code-pill">{c.code}</span>
                      <span className="catalog-card__credits">{c.credits} SKS</span>
                    </div>
                    <h3 className="catalog-card__title">{c.title}</h3>
                    <dl className="catalog-card__facts">
                      <div><dt>Instructor</dt><dd>{c.instructor}</dd></div>
                      <div><dt>Term</dt><dd>{c.term}</dd></div>
                    </dl>
                    <div className="catalog-card__seats">
                      <div className="capacity-track">
                        <div
                          className="capacity-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: state === 'full' ? 'var(--color-danger)' : pct > 80 ? 'var(--color-warning)' : 'var(--color-primary)',
                          }}
                        />
                      </div>
                      <div className="catalog-card__seat-text">
                        <span className={state === 'full' ? 'status-text--danger' : ''}>
                          {state === 'full' ? 'Class full' : `${seatsLeft} ${seatsLeft === 1 ? 'seat' : 'seats'} left`}
                        </span>
                        <span>{c.enrolled} / {c.capacity} approved</span>
                      </div>
                    </div>
                    <div className="catalog-card__action">
                      {state === 'requested' ? (
                        <>
                          <span className="catalog-card__note">Your request</span>
                          <StatusBadge status={status} />
                        </>
                      ) : state === 'closed' ? (
                        <>
                          <span className="catalog-card__note">Closed for enrollment</span>
                          <button type="button" className="btn-select-row" disabled>Closed</button>
                        </>
                      ) : state === 'full' ? (
                        <>
                          <span className="catalog-card__note">No seats available</span>
                          <button type="button" className="btn-select-row" disabled>Full</button>
                        </>
                      ) : (
                        <>
                          <span className="catalog-card__note">
                            {isSelected ? 'Filled into the form above'
                              : status === 'rejected' ? 'Rejected before · you can request again' : 'Open for enrollment'}
                          </span>
                          <button
                            type="button"
                            className={`btn-select-row ${isSelected ? 'btn-select-row--active' : ''}`}
                            onClick={() => {
                              selectCourse(c.id)
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            aria-label={isSelected ? `${c.code} selected` : `Select ${c.code} for enrollment`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

      <StudentDetailModal
        key={selectedRecord?.id ?? 'none'}
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        courses={courses}
        grades={grades}
        onWithdraw={onWithdrawEnrollment}
      />
    </>
  )
}

export default FormPage
