import { useMemo, useState } from 'react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import EnrollmentDetailModal from '../components/EnrollmentDetailModal'
import StudentDetailModal from '../components/StudentDetailModal'
import CourseFormModal from '../components/CourseFormModal'
import { computeGpa } from '../utils/grade'

const ENROLLMENT_FILTERS = ['All', 'Approved', 'Pending', 'Rejected']

function Dashboard({
  user,
  courses,
  enrollments,
  grades,
  students = [],
  isLoading = false,
  dataError = null,
  onRetry,
  onUpdateEnrollmentStatus,
  onCreateCourse,
  onUpdateCourse,
  onDeleteCourse,
}) {
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null)
  const [selectedStudentRow, setSelectedStudentRow] = useState(null)
  const [enrollmentFilter, setEnrollmentFilter] = useState('All')
  const [courseSearch, setCourseSearch] = useState('')
  const [actionError, setActionError] = useState('')
  // null = closed, {} = new course, a course object = edit that course
  const [courseForm, setCourseForm] = useState(null)

  async function handleStatusChange(enrollmentId, nextStatus) {
    setActionError('')
    try {
      await onUpdateEnrollmentStatus?.(enrollmentId, nextStatus)
    } catch (error) {
      setActionError(
        error.message || 'Unable to update enrollment status. Check your connection and try again.',
      )
    }
  }

  const isAdministrator = user.role === 'administrator'

  // Calculations for Student
  const myEnrollments = useMemo(() => {
    return enrollments.filter((e) => e.studentId === user.studentId)
  }, [enrollments, user.studentId])

  const myGrades = useMemo(() => {
    return grades.filter((g) => g.studentId === user.studentId)
  }, [grades, user.studentId])

  const totalCredits = useMemo(() => {
    return myGrades.reduce((sum, g) => sum + (g.credits || 0), 0)
  }, [myGrades])

  const gpa = useMemo(() => computeGpa(myGrades), [myGrades])

  // Filtered courses based on search
  const filteredCourses = useMemo(() => {
    if (!courseSearch.trim()) return courses
    const q = courseSearch.toLowerCase().trim()
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.instructor?.toLowerCase().includes(q),
    )
  }, [courses, courseSearch])

  // Filtered enrollments for Administrator
  const filteredAdminEnrollments = useMemo(() => {
    if (enrollmentFilter === 'All') return enrollments
    return enrollments.filter(
      (e) => (e.status || '').toLowerCase() === enrollmentFilter.toLowerCase(),
    )
  }, [enrollments, enrollmentFilter])

  if (isLoading) {
    return (
      <div className="loading-state">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Loading your information…</p>
        <Spinner label="Fetching records…" />
      </div>
    )
  }

  // ==========================================
  // ADMINISTRATOR VIEW
  // ==========================================
  if (isAdministrator) {
    const studentCount = new Set(enrollments.map((e) => e.studentId)).size
    const pendingCount = enrollments.filter((e) => e.status === 'pending').length
    const approvedCount = enrollments.filter((e) => e.status === 'approved').length

    const selectedEnrollment =
      enrollments.find((item) => item.id === selectedEnrollmentId) || null
    const selectedStudent = selectedEnrollment
      ? students.find((s) => s.studentId === selectedEnrollment.studentId)
      : null
    const selectedCourse = selectedEnrollment
      ? courses.find((c) => c.code === selectedEnrollment.courseCode)
      : null

    const adminEnrollmentColumns = [
      {
        key: 'student',
        label: 'Student',
        render: (row) => (
          <>
            <span className="table__strong">{row.studentName}</span>
            <span className="table__muted">{row.studentId}</span>
          </>
        ),
      },
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
      { key: 'term', label: 'Term' },
      { key: 'credits', label: 'Credits' },
      {
        key: 'status',
        label: 'Status',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => (
          <div className="table-actions">
            <button
              type="button"
              className="btn btn--xs btn--ghost"
              onClick={() => setSelectedEnrollmentId(row.id)}
              title="View full enrollment details"
            >
              Details
            </button>
            {row.status === 'pending' && (
              <>
                <button
                  type="button"
                  className="btn btn--xs btn--success"
                  onClick={() => handleStatusChange(row.id, 'approved')}
                  title="Approve enrollment"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" aria-hidden="true">
                    <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  className="btn btn--xs btn--danger"
                  onClick={() => handleStatusChange(row.id, 'rejected')}
                  title="Reject enrollment"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Reject</span>
                </button>
              </>
            )}
          </div>
        ),
      },
    ]

    return (
      <div className="dashboard-wrap">
        {/* Modern Hero Banner for Admin */}
        <section className="hero-card hero-card--admin">
          <div className="hero-card__deco1" />
          <div className="hero-card__deco2" />
          <div className="hero-card__content">
            <div className="hero-card__top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="hero-badge">Staff Portal</span>
                <span className="term-tag">Term 2024/2025</span>
              </div>
              <div className="hero-quick-pill">
                <span className="hero-quick-pill__item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>Registrar</span>
                </span>
                <div className="hero-quick-pill__divider" />
                <span className="hero-quick-pill__item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Secure</span>
                </span>
              </div>
            </div>
            <h1 className="hero-card__greeting">Welcome back,</h1>
            <h2 className="hero-card__name">{user.name}</h2>
            <p className="hero-card__sub">
              {user.department || 'Academic Affairs'} · {user.title || 'Registrar'}
            </p>

            <div className="hero-card__glance">
              <div className="hero-card__glance-item">
                <span className="hero-card__glance-label">Total Students</span>
                <span className="hero-card__glance-val">{studentCount}</span>
              </div>
              <div className="hero-card__glance-divider" />
              <div className="hero-card__glance-item">
                <span className="hero-card__glance-label">Pending Requests</span>
                <span className="hero-card__glance-val">{pendingCount}</span>
              </div>
              <div className="hero-card__glance-divider" />
              <div className="hero-card__glance-item">
                <span className="hero-card__glance-label">Approved Enrollments</span>
                <span className="hero-card__glance-val">{approvedCount}</span>
              </div>
            </div>
          </div>
        </section>

        {dataError && (
          <div className="banner banner--error" role="alert" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
              <span>{dataError}</span>
              {onRetry && (
                <button type="button" className="btn btn--small btn--outline" onClick={onRetry}>
                  Retry Connection
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4 StatCards Grid */}
        <div className="stats-grid">
          <StatCard
            label="Course Offerings"
            value={courses.length}
            iconName="school"
            iconColor="var(--color-primary)"
            iconBg="var(--color-primary-soft)"
          />
          <StatCard
            label="Total Students"
            value={studentCount}
            iconName="people"
            iconColor="var(--color-purple)"
            iconBg="var(--color-purple-soft)"
          />
          <StatCard
            label="Total Enrollments"
            value={enrollments.length}
            iconName="folder"
            iconColor="var(--color-primary)"
            iconBg="var(--color-primary-soft)"
          />
          <StatCard
            label="Pending Approvals"
            value={pendingCount}
            iconName="alert"
            iconColor="var(--color-warning)"
            iconBg="var(--color-warning-soft)"
            color={pendingCount > 0 ? 'var(--color-warning)' : undefined}
            hint={pendingCount > 0 ? 'Action required' : undefined}
          />
        </div>

        {actionError ? (
          <p className="alert alert--error" role="alert" style={{ marginBottom: '16px' }}>
            {actionError}
          </p>
        ) : null}

        {/* Quick Admin Navigation Strip */}
        <div className="admin-actions-bar">
          <a href="#/form" className="admin-action-btn admin-action-btn--primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>Record Student Grades</span>
          </a>
          <a href="#/output" className="admin-action-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>View Grade Records Ledger</span>
          </a>
          <a href="#/ai-advisor" className="admin-action-btn admin-action-btn--purple">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
              <path d="M10 2v3m0 10v3M2 10h3m10 0h3M4.93 4.93l2.12 2.12m5.9 5.9l2.12 2.12M4.93 15.07l2.12-2.12m5.9-5.9l2.12-2.12" />
              <circle cx="10" cy="10" r="2.5" />
            </svg>
            <span>AI Academic Advisor</span>
          </a>
          {pendingCount > 0 && (
            <button
              type="button"
              className="admin-action-btn admin-action-btn--warning"
              onClick={() => setEnrollmentFilter('Pending')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Review {pendingCount} Pending Requests</span>
            </button>
          )}
        </div>

        {/* University Enrollments Table with Filter Chips */}
        <section className="card card--elevated">
          <div className="section-head">
            <div>
              <h2 className="section-head__title">University Enrollments</h2>
              <p className="section-head__sub">
                Review pending student enrollment requests and manage course capacities.
              </p>
            </div>
            <span className="section-head__count">
              {filteredAdminEnrollments.length} records
            </span>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            {ENROLLMENT_FILTERS.map((filter) => {
              const active = enrollmentFilter === filter
              const count =
                filter === 'All'
                  ? enrollments.length
                  : enrollments.filter(
                      (e) => (e.status || '').toLowerCase() === filter.toLowerCase(),
                    ).length

              return (
                <button
                  key={filter}
                  type="button"
                  className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
                  onClick={() => setEnrollmentFilter(filter)}
                >
                  <span>{filter}</span>
                  <span className="filter-chip__badge">{count}</span>
                </button>
              )
            })}
          </div>

          <DataTable
            columns={adminEnrollmentColumns}
            rows={filteredAdminEnrollments}
            emptyTitle={`No ${enrollmentFilter.toLowerCase()} enrollments`}
            emptyMessage="Enrollment requests submitted by students will appear here."
            onRowClick={(row) => setSelectedEnrollmentId(row.id)}
          />
        </section>

        {/* Course Catalog Capacity Section */}
        <section className="card card--elevated card--spaced">
          <div className="section-head">
            <div className="section-head__left">
              <div className="section-icon-badge">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                  <path d="M10 2l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h2 className="section-head__title">Course Catalog &amp; Capacity</h2>
                <p className="section-head__sub">Live seating status across all active terms. Click a course to edit it.</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="section-head__count">{filteredCourses.length} offerings</span>
              <button type="button" className="btn btn--primary btn--small" onClick={() => setCourseForm({})}>
                + Add Course
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="search-box">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true" className="search-icon">
              <circle cx="9" cy="9" r="6" />
              <line x1="14" y1="14" x2="18" y2="18" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search courses, instructors, codes…"
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
            />
            {courseSearch ? (
              <button
                type="button"
                className="search-clear"
                onClick={() => setCourseSearch('')}
                aria-label="Clear search"
              >
                &times;
              </button>
            ) : null}
          </div>

          <div className="courses-grid">
            {filteredCourses.map((course) => {
              const percent = Math.min(
                100,
                Math.round((course.enrolled / course.capacity) * 100),
              )
              const isFull = course.enrolled >= course.capacity

              return (
                <button
                  key={course.id}
                  type="button"
                  className="course-card course-card--button"
                  onClick={() => setCourseForm(course)}
                  aria-label={`Edit ${course.code} ${course.title}`}
                >
                  <div className="course-card__top">
                    <span className="code-pill">{course.code}</span>
                    <span className="course-card__credits">{course.credits} SKS · Edit</span>
                  </div>
                  <h3 className="course-card__title">{course.title}</h3>
                  <p className="course-card__instructor">
                    {course.instructor} · Term {course.term}
                  </p>
                  <div className="course-card__capacity-wrap">
                    <div className="capacity-bar">
                      <div
                        className={`capacity-fill ${isFull ? 'capacity-fill--full' : ''}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="capacity-meta">
                      <span>{course.enrolled} / {course.capacity} seats</span>
                      <span className={isFull ? 'status-text--danger' : 'status-text--muted'}>
                        {isFull ? 'Full' : `${percent}%`}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {courseForm ? (
          <CourseFormModal
            key={courseForm.id ?? 'new'}
            course={courseForm.id ? courseForm : null}
            onClose={() => setCourseForm(null)}
            onCreate={onCreateCourse}
            onUpdate={onUpdateCourse}
            onDelete={onDeleteCourse}
          />
        ) : null}

        {selectedEnrollment && (
          <EnrollmentDetailModal
            enrollment={selectedEnrollment}
            student={selectedStudent}
            course={selectedCourse}
            onClose={() => setSelectedEnrollmentId(null)}
            onUpdateStatus={handleStatusChange}
          />
        )}
      </div>
    )
  }

  // ==========================================
  // STUDENT VIEW
  // ==========================================
  const approvedCount = myEnrollments.filter((e) => e.status === 'approved').length
  const pendingCount = myEnrollments.filter((e) => e.status === 'pending').length
  // Student dashboard shows only courses still open to request; the full catalog with request
  // statuses is on the Enroll in Course page.
  const requestedCourseIds = new Set(myEnrollments.map((e) => e.courseId))
  const availableCourses = filteredCourses
    .filter((c) => !requestedCourseIds.has(c.id) && c.enrolled < c.capacity)
    .sort((a, b) => a.code.localeCompare(b.code))

  const gradeColumns = [
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
    { key: 'term', label: 'Term' },
    { key: 'credits', label: 'Credits' },
    { key: 'score', label: 'Score' },
    {
      key: 'grade',
      label: 'Grade',
      render: (row) => (
        <div className="grade-badge">
          <span className="grade-badge__letter">{row.letter}</span>
          <span className="grade-badge__pts">{row.points.toFixed(1)} pts</span>
        </div>
      ),
    },
  ]

  return (
    <div className="dashboard-wrap">
      {/* Modern Hero Banner for Student */}
      <section className="hero-card">
        <div className="hero-card__deco1" />
        <div className="hero-card__deco2" />
        <div className="hero-card__content">
          <div className="hero-card__top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="hero-badge">Academic Portal</span>
              <span className="term-tag">Term 2024/2025</span>
            </div>
            <div className="hero-quick-pill">
              <span className="hero-quick-pill__item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                  <path d="M12 2l9 4.9v6.1c0 5-3.8 9.7-9 11-5.2-1.3-9-6-9-11V6.9l9-4.9z" />
                </svg>
                <span>UPH Verified</span>
              </span>
              <div className="hero-quick-pill__divider" />
              <span className="hero-quick-pill__item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>Active</span>
              </span>
            </div>
          </div>
          <h1 className="hero-card__greeting">Welcome back,</h1>
          <h2 className="hero-card__name">{user.name}</h2>
          <p className="hero-card__sub">
            {user.program} · {user.studentId}
          </p>

          <div className="hero-card__glance">
            <div className="hero-card__glance-item">
              <span className="hero-card__glance-label">Current GPA</span>
              <span className="hero-card__glance-val">
                {gpa > 0 ? gpa.toFixed(2) : '—'}
              </span>
            </div>
            <div className="hero-card__glance-divider" />
            <div className="hero-card__glance-item">
              <span className="hero-card__glance-label">Active Courses</span>
              <span className="hero-card__glance-val">{approvedCount}</span>
            </div>
            <div className="hero-card__glance-divider" />
            <div className="hero-card__glance-item">
              <span className="hero-card__glance-label">Total Credits</span>
              <span className="hero-card__glance-val">{totalCredits}</span>
            </div>
          </div>
        </div>
      </section>

      {dataError && (
        <div className="banner banner--error" role="alert" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
            <span>{dataError}</span>
            {onRetry && (
              <button type="button" className="btn btn--small btn--outline" onClick={onRetry}>
                Retry Connection
              </button>
            )}
          </div>
        </div>
      )}

      {/* Profile and Academic Services moved to the Profile page (src/pages/Profile.jsx). */}
      <div className="dashboard-grid dashboard-grid--single">
        <div className="dashboard-main">
          {/* 4 StatCards Grid */}
          <div className="stats-grid stats-grid--compact">
            <StatCard
              label="Enrolled"
              value={myEnrollments.length}
              iconName="book"
              iconColor="var(--color-primary)"
              iconBg="var(--color-primary-soft)"
            />
            <StatCard
              label="Approved"
              value={approvedCount}
              iconName="checkmark"
              iconColor="var(--color-success)"
              iconBg="var(--color-success-soft)"
              color="var(--color-success)"
            />
            <StatCard
              label="Pending"
              value={pendingCount}
              iconName="time"
              iconColor="var(--color-warning)"
              iconBg="var(--color-warning-soft)"
              color={pendingCount > 0 ? 'var(--color-warning)' : undefined}
              hint={pendingCount > 0 ? 'Needs review' : undefined}
            />
            <StatCard
              label="GPA"
              value={gpa > 0 ? gpa.toFixed(2) : '—'}
              iconName="trophy"
              iconColor="var(--color-purple)"
              iconBg="var(--color-purple-soft)"
              color="var(--color-primary)"
              hint={myGrades.length === 0 ? 'No grades yet' : 'Weighted 4.0 scale'}
            />
          </div>

          {/* My Grades Table */}
          <section className="card card--elevated">
            <div className="section-head">
              <div>
                <h2 className="section-head__title">My Academic Grades</h2>
                <p className="section-head__sub">Recorded letter grades and course credit points.</p>
              </div>
              <span className="section-head__count">
                {myGrades.length} records
              </span>
            </div>

            <DataTable
              columns={gradeColumns}
              rows={myGrades}
              onRowClick={(row) => setSelectedStudentRow(row)}
              emptyTitle="No grades yet"
              emptyMessage="Grades will appear here once the registrar records them."
            />
          </section>

          {/* Course Catalog Preview with Search */}
          <section className="card card--elevated card--spaced">
            <div className="section-head">
              <div className="section-head__left">
                <div className="section-icon-badge">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                    <path d="M10 2l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h2 className="section-head__title">Available to Enroll</h2>
                  <p className="section-head__sub">Courses you have not requested yet. Approved and pending ones are on the Enroll in Course page.</p>
                </div>
              </div>
              <a href="#/form" className="section-head__count">Open Enroll in Course →</a>
            </div>

            <div className="search-box">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true" className="search-icon">
                <circle cx="9" cy="9" r="6" />
                <line x1="14" y1="14" x2="18" y2="18" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search courses, instructors, codes…"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
              />
              {courseSearch ? (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setCourseSearch('')}
                  aria-label="Clear search"
                >
                  &times;
                </button>
              ) : null}
            </div>

            <div className="courses-grid">
              {availableCourses.length === 0 ? (
                <p className="catalog-empty">No open courses left to request.</p>
              ) : null}
              {availableCourses.map((course) => {
                const percent = Math.min(
                  100,
                  Math.round((course.enrolled / course.capacity) * 100),
                )
                const isFull = course.enrolled >= course.capacity

                return (
                  <div key={course.id} className="course-card">
                    <div className="course-card__top">
                      <span className="code-pill">{course.code}</span>
                      <span className="course-card__credits">{course.credits} Credits</span>
                    </div>
                    <h3 className="course-card__title">{course.title}</h3>
                    <p className="course-card__instructor">
                      {course.instructor} · Term {course.term}
                    </p>
                    <div className="course-card__capacity-wrap">
                      <div className="capacity-bar">
                        <div
                          className={`capacity-fill ${isFull ? 'capacity-fill--full' : ''}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="capacity-meta">
                        <span>{course.enrolled} / {course.capacity} seats</span>
                        <span className={isFull ? 'status-text--danger' : 'status-text--muted'}>
                          {isFull ? 'Full' : `${percent}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Student Record Detail Modal */}
      <StudentDetailModal
        record={selectedStudentRow}
        onClose={() => setSelectedStudentRow(null)}
        courses={courses}
        grades={grades}
      />
    </div>
  )
}

export default Dashboard
