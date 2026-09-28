import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable'
import { toLetterGrade } from '../utils/grade'

const TERMS = ['2024/2025']

const emptyEnrollmentForm = { courseId: '', term: TERMS[0] }
const emptyGradeForm = { studentId: '', courseId: '', score: '', term: TERMS[0] }

const courseColumns = [
  {
    key: 'course',
    label: 'Course',
    render: (row) => (
      <>
        <span className="table__strong">{row.code}</span>
        <span className="table__muted">{row.title}</span>
      </>
    ),
  },
  { key: 'credits', label: 'Credits' },
  { key: 'instructor', label: 'Instructor' },
  {
    key: 'capacity',
    label: 'Capacity',
    render: (row) => `${row.enrolled} / ${row.capacity}`,
  },
]

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
// A course is only valid for one student and term, so clear the
// previous choice whenever either of those changes.
...(name === 'studentId' || name === 'term' ? { courseId: '' } : {}),
}))
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

// A grade can only be recorded for a student who is actually enrolled
// (and approved) in that course for the selected term.
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

  function handleEnrollmentSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    if (!validateEnrollment()) {
      return
    }

    setIsSubmitting(true)

    // Simulated save so the loading state is visible.
    window.setTimeout(() => {
      try {
        const course = courses.find((item) => item.id === enrollmentForm.courseId)
        const newEnrollment = {
          id: `e-${Date.now()}`,
          studentId: user.studentId,
          studentName: user.name,
          courseCode: course.code,
          courseTitle: course.title,
          credits: course.credits,
          term: enrollmentForm.term,
          status: 'pending',
          enrolledAt: new Date().toISOString().slice(0, 10),
        }

        onAddEnrollment(newEnrollment)
        navigate('/output', {
          state: {
            success: `Enrollment request for ${course.code} — ${course.title} was submitted and is pending approval.`,
          },
        })
      } catch {
        setSubmitError(
          'Something went wrong while submitting your request. Please try again.',
        )
        setIsSubmitting(false)
      }
    }, 500)
  }

  function handleGradeSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    if (!validateGrade()) {
      return
    }

    setIsSubmitting(true)

    // Simulated save so the loading state is visible.
    window.setTimeout(() => {
      try {
        const student = students.find((item) => item.studentId === gradeForm.studentId)
        const course = courses.find((item) => item.id === gradeForm.courseId)
        const score = Number(gradeForm.score)
        const { letter, points } = toLetterGrade(score)

        const newGrade = {
          id: `g-${Date.now()}`,
          studentId: student.studentId,
          studentName: student.name,
          courseCode: course.code,
          courseTitle: course.title,
          credits: course.credits,
          term: gradeForm.term,
          score,
          letter,
          points,
        }

        onAddGrade(newGrade)
        navigate('/output', {
          state: {
            success: `Grade ${letter} (${points.toFixed(1)} pts) recorded for ${student.name} in ${course.code}.`,
          },
        })
      } catch {
        setSubmitError(
          'Something went wrong while saving the grade. Please try again.',
        )
        setIsSubmitting(false)
      }
    }, 500)
  }

const scorePreview =
gradeForm.score !== '' && !Number.isNaN(Number(gradeForm.score))
? toLetterGrade(Number(gradeForm.score))
: null

// Only courses the selected student is approved to take this term can be
// graded, so the dropdown itself makes the invalid choice impossible.
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

  return (
    <>
      <h1 className="page-title">
        {isAdministrator ? 'Record a Grade' : 'Enroll in a Course'}
      </h1>
      <p className="page-subtitle">
        {isAdministrator
          ? 'Enter a raw score — the letter grade and grade points are computed automatically.'
          : 'Choose an available course for the current term and submit your request.'}
      </p>

      {submitError ? (
        <p className="alert alert--error" role="alert">
          {submitError}
        </p>
      ) : null}

      {isAdministrator ? (
        <section className="card">
          <form onSubmit={handleGradeSubmit} noValidate>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="studentId">Student</label>
                <select
                  id="studentId"
                  name="studentId"
                  value={gradeForm.studentId}
                  onChange={handleGradeChange}
                >
                  <option value="">Select a student…</option>
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
<label htmlFor="gradeCourseId">Course</label>
<select
id="gradeCourseId"
name="courseId"
value={gradeForm.courseId}
onChange={handleGradeChange}
disabled={!gradeForm.studentId || gradeableCourses.length === 0}
>
<option value="">Select a course…</option>
{gradeableCourses.map((course) => (
<option key={course.id} value={course.id}>
{course.code} — {course.title}
</option>
))}
</select>
{!gradeForm.studentId ? (
<span className="field__hint">
Select a student first to see their enrolled courses.
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
                  placeholder="e.g. 85"
                />
                {errors.score ? (
                  <span className="field__error">{errors.score}</span>
                ) : null}
                {scorePreview ? (
                  <span className="field__hint">
                    Computed grade: {scorePreview.letter} ·{' '}
                    {scorePreview.points.toFixed(1)} points
                  </span>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="gradeTerm">Term</label>
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
            >
              {isSubmitting ? 'Saving…' : 'Record Grade'}
            </button>
          </form>
        </section>
      ) : (
        <section className="card">
          <form onSubmit={handleEnrollmentSubmit} noValidate>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="enrollCourseId">Course</label>
                <select
                  id="enrollCourseId"
                  name="courseId"
                  value={enrollmentForm.courseId}
                  onChange={handleEnrollmentChange}
                >
                  <option value="">Select a course…</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.title} ({course.credits} credits)
                    </option>
                  ))}
                </select>
                {errors.courseId ? (
                  <span className="field__error">{errors.courseId}</span>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="enrollTerm">Term</label>
                <select
                  id="enrollTerm"
                  name="term"
                  value={enrollmentForm.term}
                  onChange={handleEnrollmentChange}
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
            >
              {isSubmitting ? 'Submitting…' : 'Submit Enrollment'}
            </button>
          </form>
        </section>
      )}

      <section className="card card--spaced">
        <div className="section-head">
          <h2 className="section-head__title">Course Offerings</h2>
          <span className="section-head__count">{courses.length} courses</span>
        </div>

        <DataTable
          columns={courseColumns}
          rows={courses}
          emptyTitle="No course offerings"
          emptyMessage="There are no course offerings available right now."
        />
      </section>
    </>
  )
}

export default FormPage
