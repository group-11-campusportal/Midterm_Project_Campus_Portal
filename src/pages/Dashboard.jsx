import { useMemo, useState } from 'react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import EnrollmentDetailModal from '../components/EnrollmentDetailModal'
import { computeGpa } from '../utils/grade'

const ENROLLMENT_FILTERS = ['All', 'Approved', 'Pending', 'Rejected']

function Dashboard({
  user,
  courses,
  enrollments,
  grades,
  students = [],
  isLoading = false,
  onUpdateEnrollmentStatus,
}) {
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null)
  const [enrollmentFilter, setEnrollmentFilter] = useState('All')
  const [courseSearch, setCourseSearch] = useState('')
  const [actionError, setActionError] = useState('')

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

  // Filtered enrollments for Student
  const filteredStudentEnrollments = useMemo(() => {
    if (enrollmentFilter === 'All') return myEnrollments
    return myEnrollments.filter(
      (e) => (e.status || '').toLowerCase() === enrollmentFilter.toLowerCase(),
    )
  }, [myEnrollments, enrollmentFilter])

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
                <p className="section-head__sub">Live seating status across all active terms.</p>
              </div>
            </div>
            <span className="section-head__count">{filteredCourses.length} offerings</span>
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
  const standingText =
    gpa >= 3.5
      ? "Dean's List · First Class Standing"
      : gpa >= 3.0
        ? 'Good Academic Standing'
        : 'Satisfactory Standing'

  const studentInitials = user.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AP'

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
    { key: 'term', label: 'Term' },
    { key: 'credits', label: 'Credits' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ]

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

      <div className="dashboard-grid">
        {/* Left Column: My Profile */}
        <aside className="dashboard-sidebar">
          <section className="card card--elevated profile-card">
            <div className="profile-card__avatar-wrap">
              <div className="profile-card__avatar">
                <span>{studentInitials}</span>
              </div>
              <h3 className="profile-card__name">{user.name}</h3>
              <p className="profile-card__email">{user.email}</p>
              <span className="profile-card__pill">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                  <path d="M10 2l8 4-8 4-8-4 8-4zM2 10l8 4 8-4M2 14l8 4 8-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Student</span>
              </span>
            </div>

            <div className="profile-card__body">
              <div className="profile-card__section-head">
                <span className="profile-card__section-title">Identity &amp; Credentials</span>
                <span className="profile-card__section-sub">Verified by Registrar</span>
              </div>

              <div className="profile-row-list">
                <div className="profile-row">
                  <span className="profile-row__label">Student ID</span>
                  <span className="profile-row__val">{user.studentId}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-row__label">Program</span>
                  <span className="profile-row__val">{user.program}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-row__label">Academic Year</span>
                  <span className="profile-row__val">Year {user.year}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-row__label">Campus Email</span>
                  <span className="profile-row__val">{user.email}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-row__label">Status</span>
                  <span className="profile-row__val status-text--success">Active Enrolled</span>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Academic Services Card inspired by Mobile Reference */}
          <section className="card card--elevated card--spaced quick-services-card">
            <div className="quick-services-card__header">
              <h3 className="quick-services-card__title">Academic Services</h3>
              <span className="quick-services-card__badge">UPH Portal</span>
            </div>
            <ul className="quick-services-list">
              <li>
                <a
                  href="https://moodle.uph.edu"
                  target="_blank"
                  rel="noreferrer"
                  className="quick-service-item"
                  aria-label="Open LMS Moodle (opens in new tab)"
                >
                  <div className="quick-service-icon quick-service-icon--orange">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div className="quick-service-info">
                    <span className="quick-service-name">LMS / Moodle</span>
                    <span className="quick-service-desc">Lecture slides &amp; assignments</span>
                  </div>
                  <svg className="quick-service-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                    <polyline points="7 5 12 10 7 15" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://library.uph.edu"
                  target="_blank"
                  rel="noreferrer"
                  className="quick-service-item"
                  aria-label="Visit University Library (opens in new tab)"
                >
                  <div className="quick-service-icon quick-service-icon--blue">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                      <line x1="3" y1="9" x2="9" y2="9" />
                      <line x1="3" y1="15" x2="9" y2="15" />
                    </svg>
                  </div>
                  <div className="quick-service-info">
                    <span className="quick-service-name">Digital Library</span>
                    <span className="quick-service-desc">Journals, e-books &amp; research</span>
                  </div>
                  <svg className="quick-service-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                    <polyline points="7 5 12 10 7 15" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="#/form"
                  className="quick-service-item"
                  aria-label="Register Course for Term"
                >
                  <div className="quick-service-icon quick-service-icon--green">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                  </div>
                  <div className="quick-service-info">
                    <span className="quick-service-name">Course Enrollment</span>
                    <span className="quick-service-desc">Register subjects for active term</span>
                  </div>
                  <svg className="quick-service-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                    <polyline points="7 5 12 10 7 15" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="#/output"
                  className="quick-service-item"
                  aria-label="View My Submissions & Transcripts"
                >
                  <div className="quick-service-icon quick-service-icon--purple">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div className="quick-service-info">
                    <span className="quick-service-name">My Submissions</span>
                    <span className="quick-service-desc">Official enrollment receipts</span>
                  </div>
                  <svg className="quick-service-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                    <polyline points="7 5 12 10 7 15" />
                  </svg>
                </a>
              </li>
            </ul>
          </section>
        </aside>

        {/* Right Column: Stats, GPA Card, Grades, Enrollments */}
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

          {/* GPA Banner matching Mobile */}
          {gpa > 0 ? (
            <section className="gpa-banner">
              <div className="gpa-banner__top">
                <div className="gpa-standing-badge">
                  <svg viewBox="0 0 20 20" fill="none" stroke="#fcd34d" strokeWidth="2" width="14" height="14" aria-hidden="true">
                    <circle cx="10" cy="8" r="5" />
                    <path d="M7 13l-2 5 5-2 5 2-2-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{standingText}</span>
                </div>
                <span className="gpa-term">Fall 2024</span>
              </div>

              <div className="gpa-banner__main">
                <div className="gpa-banner__left">
                  <h3 className="gpa-banner__title">Cumulative GPA</h3>
                  <p className="gpa-banner__desc">Credit-weighted official calculation</p>
                  <div className="gpa-banner__pills">
                    <span className="gpa-mini-pill">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12" aria-hidden="true">
                        <path d="M2 13.5A1.5 1.5 0 0 1 3.5 12H14" />
                        <path d="M3.5 2H14v12H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2z" />
                      </svg>
                      <span>{totalCredits} Credits</span>
                    </span>
                    <span className="gpa-mini-pill">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12" aria-hidden="true">
                        <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{myGrades.length} Courses</span>
                    </span>
                  </div>
                </div>

                <div className="gpa-banner__right">
                  <span className="gpa-banner__score">{gpa.toFixed(2)}</span>
                  <span className="gpa-banner__scale">out of 4.00</span>
                </div>
              </div>
            </section>
          ) : null}

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
              emptyTitle="No grades yet"
              emptyMessage="Grades will appear here once the registrar records them."
            />
          </section>

          {/* My Enrollments Table with Filter Chips */}
          <section className="card card--elevated card--spaced">
            <div className="section-head">
              <div>
                <h2 className="section-head__title">My Enrollments</h2>
                <p className="section-head__sub">Status of course requests submitted this term.</p>
              </div>
              <span className="section-head__count">
                {filteredStudentEnrollments.length} records
              </span>
            </div>

            {/* Filter Chips */}
            <div className="filter-bar">
              {ENROLLMENT_FILTERS.map((filter) => {
                const active = enrollmentFilter === filter
                const count =
                  filter === 'All'
                    ? myEnrollments.length
                    : myEnrollments.filter(
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
              columns={myEnrollmentColumns}
              rows={filteredStudentEnrollments}
              emptyTitle={`No ${enrollmentFilter.toLowerCase()} courses`}
              emptyMessage="You have not enrolled in any course matching this filter."
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
                  <h2 className="section-head__title">Course Catalog Offerings</h2>
                  <p className="section-head__sub">Explore available subjects and check open seating.</p>
                </div>
              </div>
              <span className="section-head__count">{filteredCourses.length} offerings</span>
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
              {filteredCourses.map((course) => {
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
    </div>
  )
}

export default Dashboard
