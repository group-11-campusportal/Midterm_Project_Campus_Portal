import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toLetterGrade } from '../utils/grade'

const TERMS = ['2024/2025']

const emptyEnrollmentForm = { courseId: '', term: TERMS[0] }
const emptyGradeForm = { studentId: '', courseId: '', score: '', term: TERMS[0] }

// One form page. The fields and the action depend on the logged-in role,
// but both paths use controlled inputs, validation, and preventDefault.
function FormPage({
  user,
  courses,
  enrollments,
  grades,
  students,
  onAddEnrollment,
  onAddGrade,
}) {
  const navigate = useNavigate()
  const isAdministrator = user.role === 'administrator'

  const [enrollmentForm, setEnrollmentForm] = useState(emptyEnrollmentForm)
  const [gradeForm, setGradeForm] = useState(emptyGradeForm)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  function handleEnrollmentChange(event) {
    const { name, value } = event.target
    setEnrollmentForm((previous) => ({ ...previous, [name]: value }))
    setErrors({})
    setSubmitError('')
  }

  function handleGradeChange(event) {
    const { name, value } = event.target
    setGradeForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === 'studentId' || name === 'term' ? { courseId: '' } : {}),
    }))
    setErrors({})
    setSubmitError('')
  }

  function selectCourse(courseId) {
    if (isAdministrator) {
      setGradeForm((prev) => ({ ...prev, courseId }))
    } else {
      setEnrollmentForm((prev) => ({ ...prev, courseId }))
    }
    setErrors({})
    setSubmitError('')
  }

  function validateEnrollment() {
    const nextErrors = {}

    if (!enrollmentForm.courseId) {
      nextErrors.courseId = 'Please select a course.'
      setErrors(nextErrors)
      return false
    }

    const course = courses.find((item) => item.id === enrollmentForm.courseId)
    const alreadyEnrolled = enrollments.some(
      (enrollment) =>
        enrollment.studentId === user.studentId &&
        enrollment.courseCode === course.code &&
        enrollment.term === enrollmentForm.term,
    )

    if (alreadyEnrolled) {
      nextErrors.courseId =
        'You are already enrolled in this course for this term.'
    } else if (course.enrolled >= course.capacity) {
      nextErrors.courseId = 'This course is already full.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function validateGrade() {
    const nextErrors = {}

    if (!gradeForm.studentId) {
      nextErrors.studentId = 'Please select a student.'
    }
    if (!gradeForm.courseId) {
      nextErrors.courseId = 'Please select a course.'
    }

    const score = Number(gradeForm.score)
    if (gradeForm.score === '') {
      nextErrors.score = 'Score is required.'
    } else if (Number.isNaN(score) || score < 0 || score > 100) {
      nextErrors.score = 'Score must be a number between 0 and 100.'
    }

    if (gradeForm.studentId && gradeForm.courseId) {
      const student = students.find((item) => item.studentId === gradeForm.studentId)
      const course = courses.find((item) => item.id === gradeForm.courseId)

      const isEnrolled = enrollments.some(
        (enrollment) =>
          enrollment.studentId === student.studentId &&
          enrollment.courseCode === course.code &&
          enrollment.term === gradeForm.term &&
          enrollment.status === 'approved',
      )
      if (!isEnrolled) {
        nextErrors.courseId =
          'This student is not enrolled in the selected course for this term.'
      } else {
        const duplicate = grades.some(
          (grade) =>
            grade.studentId === student.studentId &&
            grade.courseCode === course.code &&
            grade.term === gradeForm.term,
        )
        if (duplicate) {
          nextErrors.courseId =
            'A grade for this student and course already exists for this term.'
        }
      }
    }

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
          'Something went wrong while submitting your request. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGradeSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    if (!validateGrade()) {
      return
    }
    setIsSubmitting(true)
    try {
      const student = students.find((item) => item.studentId === gradeForm.studentId)
      const course = courses.find((item) => item.id === gradeForm.courseId)
      const score = Number(gradeForm.score)
      // Find the approved enrollment ID required by POST /api/grades
      const matchingEnrollment = enrollments.find(
        (enrollment) =>
          enrollment.studentId === student.studentId &&
          enrollment.courseCode === course.code &&
          enrollment.term === gradeForm.term &&
          enrollment.status === 'approved',
      )
      const savedGrade = await onAddGrade({
        enrollmentId: matchingEnrollment.id,
        score,
      })
      navigate('/output', {
        state: {
          success: `Grade ${savedGrade.letter} (${savedGrade.points.toFixed(1)} pts) recorded for ${student.name} in ${course.code}.`,
        },
      })
    } catch (error) {
      setSubmitError(
        error.message ||
          'Something went wrong while saving the grade. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const scorePreview =
    gradeForm.score !== '' && !Number.isNaN(Number(gradeForm.score))
      ? toLetterGrade(Number(gradeForm.score))
      : null

  const gradeableCourses = gradeForm.studentId
    ? courses.filter((course) =>
        enrollments.some(
          (enrollment) =>
            enrollment.studentId === gradeForm.studentId &&
            enrollment.courseCode === course.code &&
            enrollment.term === gradeForm.term &&
            enrollment.status === 'approved',
        ),
      )
    : []

  // Selected course object for real-time preview
  const selectedCourseId = isAdministrator ? gradeForm.courseId : enrollmentForm.courseId
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
                {isAdministrator ? 'Registrar Operations' : 'Course Enrollment'}
              </span>
              <span className="term-tag">Term 2024/2025</span>
            </div>
            <div className="hero-quick-pill">
              <span className="hero-quick-pill__item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span>{isAdministrator ? 'Grading System' : 'Max 24 SKS'}</span>
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
            {isAdministrator ? 'Record Academic Grades' : 'Course Enrollment Center'}
          </h1>
          <p className="hero-subtitle">
            {isAdministrator
              ? 'Enter raw scores for approved student enrollments. Letter grades and credit-weighted points calculate instantly.'
              : 'Select courses from the official university catalog to register for the upcoming academic term.'}
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
                {isAdministrator ? 'Grade Entry Form' : 'Enrollment Application'}
              </h2>
              <p className="table__muted" style={{ fontSize: '13px', marginTop: '2px' }}>
                {isAdministrator
                  ? 'Assign grades to approved students.'
                  : 'Submit course registration for semester verification.'}
              </p>
            </div>
          </div>

          {isAdministrator ? (
            <form onSubmit={handleGradeSubmit} noValidate style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="field">
                  <label htmlFor="studentId">Select Student</label>
                  <select
                    id="studentId"
                    name="studentId"
                    value={gradeForm.studentId}
                    onChange={handleGradeChange}
                  >
                    <option value="">Choose a student…</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.studentId}>
                        {student.name} ({student.studentId})
                      </option>
                    ))}
                  </select>
                  {errors.studentId ? (
                    <span className="field__error">{errors.studentId}</span>
                  ) : null}
                </div>

                <div className="field">
                  <label htmlFor="gradeCourseId">Select Course</label>
                  <select
                    id="gradeCourseId"
                    name="courseId"
                    value={gradeForm.courseId}
                    onChange={handleGradeChange}
                    disabled={!gradeForm.studentId || gradeableCourses.length === 0}
                  >
                    <option value="">Choose course…</option>
                    {gradeableCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} — {course.title} ({course.credits} SKS)
                      </option>
                    ))}
                  </select>
                  {!gradeForm.studentId ? (
                    <span className="field__hint">
                      Select a student first to see approved courses.
                    </span>
                  ) : gradeableCourses.length === 0 ? (
                    <span className="field__hint">
                      This student has no approved courses for this term.
                    </span>
                  ) : null}
                  {errors.courseId ? (
                    <span className="field__error">{errors.courseId}</span>
                  ) : null}
                </div>

                <div className="field">
                  <label htmlFor="score">Raw Score (0–100)</label>
                  <input
                    id="score"
                    name="score"
                    type="number"
                    min="0"
                    max="100"
                    value={gradeForm.score}
                    onChange={handleGradeChange}
                    placeholder="e.g. 88"
                  />
                  {errors.score ? (
                    <span className="field__error">{errors.score}</span>
                  ) : null}
                  {scorePreview ? (
                    <div style={{ marginTop: '6px' }}>
                      <span className={`grade-badge-chip grade-badge-chip--${scorePreview.letter[0].toLowerCase()}`}>
                        {scorePreview.letter} · {scorePreview.points.toFixed(1)} points
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="field">
                  <label htmlFor="gradeTerm">Academic Term</label>
                  <select
                    id="gradeTerm"
                    name="term"
                    value={gradeForm.term}
                    onChange={handleGradeChange}
                  >
                    {TERMS.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn--primary"
                disabled={isSubmitting}
                style={{ width: '100%', marginTop: '20px' }}
              >
                {isSubmitting ? 'Recording Grade…' : 'Record Grade in Database'}
              </button>
            </form>
          ) : (
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
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} — {course.title} ({course.credits} SKS)
                      </option>
                    ))}
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Mon 08:00 - 10:30</span>
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
                  <select
                    id="enrollTerm"
                    name="term"
                    value={enrollmentForm.term}
                    onChange={handleEnrollmentChange}
                  >
                    {TERMS.map((term) => (
                      <option key={term} value={term}>
                        {term} (Current Regular Term)
                      </option>
                    ))}
                  </select>
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
          )}
        </section>

        {/* Right Column: Interactive Course Catalog Card */}
        <section className="card">
          <div className="section-head">
            <div>
              <h2 className="section-head__title">Course Catalog & Capacity</h2>
              <p className="table__muted" style={{ fontSize: '13px', marginTop: '2px' }}>
                Browse live availability. Click "Select" to fill the form.
              </p>
            </div>
            <span className="section-head__count">{filteredCourses.length} offerings</span>
          </div>

          {/* Quick Search Bar */}
          <div className="catalog-search-wrap">
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
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}
                  title="Clear search"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Upgraded Table with Seat Progress Bar & Direct Selection */}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Credits</th>
                  <th scope="col">Instructor</th>
                  <th scope="col">Capacity</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                      No courses found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((c) => {
                    const pct = Math.min(100, Math.round((c.enrolled / c.capacity) * 100))
                    const isSelected = selectedCourseId === c.id
                    const isFull = c.enrolled >= c.capacity

                    return (
                      <tr key={c.id} style={isSelected ? { backgroundColor: 'var(--color-primary-soft)' } : undefined}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="table__strong" style={{ fontFamily: 'var(--font-mono)' }}>{c.code}</span>
                            <span className="table__muted">{c.title}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{c.credits} SKS</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{c.instructor}</span>
                        </td>
                        <td style={{ minWidth: '130px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: isFull ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                              {c.enrolled} / {c.capacity} seats ({pct}%)
                            </span>
                            <div className="capacity-track">
                              <div
                                className="capacity-bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  background: isFull
                                    ? 'var(--color-danger)'
                                    : pct > 80
                                    ? 'var(--color-warning)'
                                    : 'var(--color-primary)',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className={`btn-select-row ${isSelected ? 'btn-select-row--active' : ''}`}
                            onClick={() => selectCourse(c.id)}
                            disabled={isFull && !isAdministrator}
                            title={isFull ? 'Course is full' : 'Select for registration'}
                          >
                            {isSelected ? (
                              <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Selected</span>
                              </>
                            ) : isFull ? (
                              <span>Full</span>
                            ) : (
                              <span>Select</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}

export default FormPage
