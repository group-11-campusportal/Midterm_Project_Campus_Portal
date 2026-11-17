import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'

// The "form output" page. It reads the shared state that lives in App,
// so every record added on the form page shows up here — newest first.
function FormOutput({ user, enrollments, grades }) {
  const location = useLocation()
  const successMessage = location.state?.success
  const isAdministrator = user.role === 'administrator'
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTerm, setFilterTerm] = useState('all')

  const baseRows = useMemo(() => {
    return isAdministrator
      ? [...grades].reverse()
      : enrollments
          .filter((enrollment) => enrollment.studentId === user.studentId)
          .reverse()
  }, [isAdministrator, grades, enrollments, user.studentId])

  // Filter rows by search and term
  const filteredRows = useMemo(() => {
    return baseRows.filter((row) => {
      if (filterTerm !== 'all' && row.term !== filterTerm) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      if (isAdministrator) {
        return (
          row.studentName?.toLowerCase().includes(q) ||
          row.studentId?.toLowerCase().includes(q) ||
          row.courseCode?.toLowerCase().includes(q) ||
          row.courseTitle?.toLowerCase().includes(q) ||
          row.letter?.toLowerCase().includes(q)
        )
      }
      return (
        row.courseCode?.toLowerCase().includes(q) ||
        row.courseTitle?.toLowerCase().includes(q) ||
        row.status?.toLowerCase().includes(q)
      )
    })
  }, [baseRows, searchQuery, filterTerm, isAdministrator])

  // Compute summary stats for the top metric chips
  const stats = useMemo(() => {
    if (isAdministrator) {
      const total = grades.length
      const avgScore =
        total > 0
          ? (grades.reduce((s, g) => s + (Number(g.score) || 0), 0) / total).toFixed(1)
          : '0'
      const deansListCount = grades.filter((g) => (Number(g.points) || 0) >= 3.5).length
      return { total, avgScore, deansListCount, term: '2024/2025' }
    }
    const myEnrollments = enrollments.filter((e) => e.studentId === user.studentId)
    const total = myEnrollments.length
    const approved = myEnrollments.filter((e) => e.status === 'approved').length
    const pending = myEnrollments.filter((e) => e.status === 'pending').length
    const credits = myEnrollments
      .filter((e) => e.status === 'approved')
      .reduce((s, e) => s + (e.credits || 0), 0)
    return { total, approved, pending, credits }
  }, [isAdministrator, grades, enrollments, user.studentId])

  function getAvatarInitials(name) {
    if (!name) return 'ST'
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  function getGradeChipClass(letter) {
    if (!letter) return 'grade-badge-chip--b'
    const char = letter[0].toUpperCase()
    if (char === 'A') return 'grade-badge-chip--a'
    if (char === 'B') return 'grade-badge-chip--b'
    if (char === 'C') return 'grade-badge-chip--c'
    return 'grade-badge-chip--d'
  }

  return (
    <>
      {/* Modern Royal Navy Hero Header */}
      <section className={`hero-card ${isAdministrator ? 'hero-card--admin' : ''}`}>
        <div className="hero-card__deco1" />
        <div className="hero-card__deco2" />

        <div className="hero-card__content">
          <div className="hero-card__top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="hero-badge">
                {isAdministrator ? 'Academic Registry' : 'My Academic Records'}
              </span>
              <span className="term-tag">Term 2024/2025</span>
            </div>
            <div className="hero-quick-pill">
              <span className="hero-quick-pill__item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>Official Transcript</span>
              </span>
              <div className="hero-quick-pill__divider" />
              <span className="hero-quick-pill__item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Verified</span>
              </span>
            </div>
          </div>

          <h1 className="hero-title" style={{ fontSize: '26px' }}>
            {isAdministrator ? 'University Grade Records' : 'My Enrollment Submissions'}
          </h1>
          <p className="hero-subtitle">
            {isAdministrator
              ? 'Complete historical ledger of grades recorded across all programs, updated in real time.'
              : 'Every enrollment submission and status receipt for your academic term.'}
          </p>
        </div>
      </section>

      {successMessage ? (
        <p className="alert alert--success" role="status" style={{ marginTop: '16px' }}>
          {successMessage}
        </p>
      ) : null}

      {/* Summary Statistics Row */}
      <div className="output-stats-row" style={{ marginTop: '20px' }}>
        {isAdministrator ? (
          <>
            <div className="output-stat-chip">
              <span className="output-stat-label">Total Grades</span>
              <span className="output-stat-val">{stats.total}</span>
              <span className="table__muted" style={{ fontSize: '12px' }}>Recorded records</span>
            </div>
            <div className="output-stat-chip">
              <span className="output-stat-label">Average Score</span>
              <span className="output-stat-val" style={{ color: 'var(--color-primary)' }}>
                {stats.avgScore}%
              </span>
              <span className="table__muted" style={{ fontSize: '12px' }}>Mean across cohort</span>
            </div>
            <div className="output-stat-chip">
              <span className="output-stat-label">Honors / Dean's List</span>
              <span className="output-stat-val" style={{ color: 'var(--color-success)' }}>
                {stats.deansListCount}
              </span>
              <span className="table__muted" style={{ fontSize: '12px' }}>Grades ≥ 3.5 pts</span>
            </div>
            <div className="output-stat-chip">
              <span className="output-stat-label">Academic Term</span>
              <span className="output-stat-val" style={{ fontSize: '18px', paddingTop: '4px' }}>
                {stats.term}
              </span>
              <span className="table__muted" style={{ fontSize: '12px' }}>Active regular session</span>
            </div>
          </>
        ) : (
          <>
            <div className="output-stat-chip">
              <span className="output-stat-label">Total Submissions</span>
              <span className="output-stat-val">{stats.total}</span>
              <span className="table__muted" style={{ fontSize: '12px' }}>Courses registered</span>
            </div>
            <div className="output-stat-chip">
              <span className="output-stat-label">Approved Status</span>
              <span className="output-stat-val" style={{ color: 'var(--color-success)' }}>
                {stats.approved}
              </span>
              <span className="table__muted" style={{ fontSize: '12px' }}>Verified by registrar</span>
            </div>
            <div className="output-stat-chip">
              <span className="output-stat-label">Pending Approval</span>
              <span className="output-stat-val" style={{ color: stats.pending > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                {stats.pending}
              </span>
              <span className="table__muted" style={{ fontSize: '12px' }}>In review queue</span>
            </div>
            <div className="output-stat-chip">
              <span className="output-stat-label">Approved SKS</span>
              <span className="output-stat-val" style={{ color: 'var(--color-primary)' }}>
                {stats.credits} SKS
              </span>
              <span className="table__muted" style={{ fontSize: '12px' }}>Current term study load</span>
            </div>
          </>
        )}
      </div>

      {/* Main Records Table Card */}
      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-head__title">
              {isAdministrator ? 'Grade Registry Ledger' : 'My Registered Courses'}
            </h2>
            <p className="table__muted" style={{ fontSize: '13px', marginTop: '2px' }}>
              Showing newest entries first. Filter or search records in real time.
            </p>
          </div>
          <span className="section-head__count">{filteredRows.length} records</span>
        </div>

        {/* Filter Controls Bar */}
        <div className="output-controls-bar">
          <div className="catalog-search-input" style={{ maxWidth: '360px', width: '100%' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true" style={{ color: 'var(--color-text-muted)' }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={isAdministrator ? 'Search student, course, grade…' : 'Search course or status…'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}
                title="Clear"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="filterTermSelect" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Term:
            </label>
            <select
              id="filterTermSelect"
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text)',
              }}
            >
              <option value="all">All Terms</option>
              <option value="2024/2025">2024/2025</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-wrap">
          {isAdministrator ? (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Course</th>
                  <th scope="col">Term</th>
                  <th scope="col">Score</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Grade Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>
                      No grade records found matching the search.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="student-avatar-cell">
                          <div className="student-avatar-circle">
                            {getAvatarInitials(row.studentName)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="table__strong">{row.studentName}</span>
                            <span className="table__muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                              {row.studentId}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="table__strong" style={{ fontFamily: 'var(--font-mono)' }}>{row.courseCode}</span>
                          <span className="table__muted">{row.courseTitle}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{row.term}</span>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '15px' }}>{row.score}</span>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>/ 100</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`grade-badge-chip ${getGradeChipClass(row.letter)}`}>
                          <span>{row.letter}</span>
                          <span style={{ opacity: 0.7 }}>·</span>
                          <span>{Number(row.points).toFixed(1)} pts</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Term</th>
                  <th scope="col">Credits</th>
                  <th scope="col">Submitted</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>
                      No submissions found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="table__strong" style={{ fontFamily: 'var(--font-mono)' }}>{row.courseCode}</span>
                          <span className="table__muted">{row.courseTitle}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{row.term}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{row.credits} SKS</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                          {row.enrolledAt || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  )
}

export default FormOutput
