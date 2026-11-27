import { useEffect, useMemo, useState } from 'react'
import { toLetterGrade } from '../utils/grade'

/**
 * Administrator: record a grade. Web version of the mobile Record Grade sheet
 * (mobile-app/src/components/RecordGradeModal.js). Steps: student -> academic term ->
 * approved course -> raw score. The API receives only { enrollmentId, score };
 * the server computes the official letter and points.
 */
// `initial` (optional): an approved enrollment to pre-select, from the "no grade yet" list.
function RecordGradeModal({ students, enrollments, grades, onClose, onRecord, initial }) {
  const [studentId, setStudentId] = useState(initial?.studentId ?? null)
  const [term, setTerm] = useState(initial?.term ?? null)
  const [enrollmentId, setEnrollmentId] = useState(initial?.id ?? null)
  const [scoreText, setScoreText] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  const approved = useMemo(() => enrollments.filter((e) => e.status === 'approved'), [enrollments])
  const gradeByEnrollment = useMemo(() => {
    const map = new Map()
    for (const grade of grades) map.set(grade.enrollmentId, grade)
    return map
  }, [grades])

  const termsFor = (id) =>
    [...new Set(approved.filter((e) => e.studentId === id).map((e) => e.term))].sort().reverse()
  const terms = studentId ? termsFor(studentId) : []
  const courseOptions = approved.filter((e) => e.studentId === studentId && e.term === term)

  const selectedStudent = students.find((s) => s.studentId === studentId) ?? null
  const selectedCourse = courseOptions.find((e) => e.id === enrollmentId) ?? null

  const scoreValue = Number(scoreText.trim().replace(',', '.'))
  const score =
    scoreText.trim() !== '' && Number.isFinite(scoreValue) && scoreValue >= 0 && scoreValue <= 100
      ? scoreValue
      : null
  const preview = score === null ? null : toLetterGrade(score)

  function chooseStudent(id) {
    setStudentId(id)
    setTerm(termsFor(id)[0] ?? null)
    setEnrollmentId(null)
    setErrors({})
    setSubmitError('')
  }

  function chooseTerm(value) {
    setTerm(value)
    setEnrollmentId(null)
    setErrors({})
  }

  function chooseCourse(item) {
    if (gradeByEnrollment.has(item.id)) {
      setErrors({ course: 'This course already has a grade for this student and term.' })
      return
    }
    setEnrollmentId(item.id)
    setErrors({})
    setSubmitError('')
  }

  function validate() {
    const next = {}
    if (!studentId) next.student = 'Select a student.'
    else if (!enrollmentId) next.course = 'Select an approved course.'
    if (scoreText.trim() === '') next.score = 'Score is required.'
    else if (score === null) next.score = 'Score must be a number between 0 and 100.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy || !validate()) return
    setBusy(true)
    setSubmitError('')
    try {
      await onRecord({ enrollmentId, score })
      onClose()
    } catch (failure) {
      // 409 = grade already exists or the enrollment is no longer approved.
      setSubmitError(failure.message || 'Unable to record the grade. Try again.')
    } finally {
      setBusy(false)
    }
  }

  // Step numbers follow what is visible, like the mobile sheet.
  const scoreStep = 2 + (studentId ? 1 : 0) + (studentId && term ? 1 : 0)

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()} role="presentation">
      <form
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-grade-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <header className="modal-header">
          <div className="rg-head">
            <span className="rg-head__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
            <div>
              <h2 id="record-grade-title" className="modal-title">Record Grade</h2>
              <span className="modal-subtitle">
                Enter a raw score for an approved enrollment. The letter grade and points are calculated by the server.
              </span>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close" disabled={busy}>
            &times;
          </button>
        </header>

        <div className="modal-body">
          <Step number={1} label="Select Student" error={errors.student}>
            {students.length === 0 ? (
              <p className="rg-hint">No students found.</p>
            ) : (
              students.map((student) => {
                const own = approved.filter((e) => e.studentId === student.studentId)
                const ungraded = own.filter((e) => !gradeByEnrollment.has(e.id)).length
                return (
                  <Option
                    key={student.studentId}
                    name="rg-student"
                    selected={student.studentId === studentId}
                    onSelect={() => chooseStudent(student.studentId)}
                    title={student.name}
                    detail={`${student.studentId}${student.program ? ` · ${student.program}` : ''}`}
                    note={own.length ? `${ungraded} of ${own.length} approved courses not graded` : 'No approved courses'}
                    noteTone={own.length && ungraded > 0 ? 'warning' : 'success'}
                  />
                )
              })
            )}
          </Step>

          {studentId ? (
            <Step number={2} label="Academic Term">
              {terms.length ? (
                <div className="rg-chips">
                  {terms.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`rg-chip ${value === term ? 'rg-chip--active' : ''}`}
                      aria-pressed={value === term}
                      onClick={() => chooseTerm(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rg-hint">This student has no approved courses yet.</p>
              )}
            </Step>
          ) : null}

          {studentId && term ? (
            <Step number={3} label="Select Course" error={errors.course}>
              {courseOptions.map((item) => {
                const existing = gradeByEnrollment.get(item.id)
                return (
                  <Option
                    key={item.id}
                    name="rg-course"
                    selected={item.id === enrollmentId}
                    disabled={Boolean(existing)}
                    onSelect={() => chooseCourse(item)}
                    title={`${item.courseCode} — ${item.courseTitle}`}
                    detail={`${item.credits} SKS · Term ${item.term}`}
                    note={existing ? `Already graded: ${existing.letter} (score ${existing.score})` : 'Approved · not graded yet'}
                    noteTone={existing ? 'muted' : 'success'}
                  />
                )
              })}
            </Step>
          ) : null}

          <Step number={scoreStep} label="Raw Score (0–100)" error={errors.score} htmlFor="rg-score">
            <div className={`rg-input ${errors.score ? 'rg-input--error' : ''}`}>
              <input
                id="rg-score"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 88"
                maxLength={6}
                value={scoreText}
                onChange={(event) => {
                  setScoreText(event.target.value)
                  setErrors((prev) => ({ ...prev, score: undefined }))
                }}
              />
              <span className="rg-input__suffix">/ 100</span>
            </div>
            {preview ? (
              <div className="rg-preview">
                <span className="rg-preview__letter">{preview.letter}</span>
                <span>{preview.points.toFixed(1)} grade points (preview)</span>
              </div>
            ) : null}
          </Step>

          {selectedStudent && selectedCourse ? (
            <p className="rg-summary">
              {selectedStudent.name} · {selectedCourse.courseCode} · {selectedCourse.term}
            </p>
          ) : null}

          {submitError ? (
            <p className="alert alert--error" role="alert" style={{ margin: 0 }}>{submitError}</p>
          ) : null}
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Recording grade…' : 'Record Grade'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function Step({ number, label, error, htmlFor, children }) {
  const LabelTag = htmlFor ? 'label' : 'span'
  return (
    <div className="rg-step">
      <div className="rg-step__head">
        <span className="rg-step__dot">{number}</span>
        <LabelTag className="rg-step__label" htmlFor={htmlFor}>{label}</LabelTag>
      </div>
      <div className="rg-step__body">{children}</div>
      {error ? <span className="field__error">{error}</span> : null}
    </div>
  )
}

function Option({ name, title, detail, note, noteTone, selected, disabled, onSelect }) {
  return (
    <label className={`rg-option ${selected ? 'rg-option--selected' : ''} ${disabled ? 'rg-option--disabled' : ''}`}>
      <input type="radio" name={name} checked={selected} onChange={onSelect} onClick={disabled ? onSelect : undefined} />
      <span className="rg-option__text">
        <span className="rg-option__title">{title}</span>
        <span className="rg-option__detail">{detail}</span>
        <span className={`rg-option__note rg-option__note--${noteTone}`}>{note}</span>
      </span>
    </label>
  )
}

export default RecordGradeModal
