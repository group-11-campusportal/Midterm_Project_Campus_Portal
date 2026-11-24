import { useEffect, useState } from 'react'

const EMPTY = { code: '', title: '', credits: '3', term: '2024/2025', instructor: '', capacity: '30' }

// Same limits as backend/src/validation.js (courseInput), so most mistakes are caught before the request.
function validate(form) {
  const errors = {}
  const text = (key, label, max) => {
    const value = form[key].trim()
    if (!value) errors[key] = `${label} is required.`
    else if (value.length > max) errors[key] = `${label} must be at most ${max} characters.`
  }
  text('code', 'Course code', 30)
  text('title', 'Title', 200)
  text('term', 'Term', 40)
  text('instructor', 'Instructor', 200)
  const credits = Number(form.credits)
  if (!Number.isInteger(credits) || credits < 1 || credits > 12) errors.credits = 'Credits must be a whole number from 1 to 12.'
  const capacity = Number(form.capacity)
  if (!Number.isInteger(capacity) || capacity < 1) errors.capacity = 'Capacity must be a whole number of at least 1.'
  return errors
}

/**
 * Administrator: add, edit or delete a course offering.
 * POST /api/courses, PUT /api/courses/:id, DELETE /api/courses/:id.
 * The server refuses (409) to delete a course with enrollments, to change code/term after an
 * enrollment exists, or to set capacity below the approved count; that message is shown here.
 */
function CourseFormModal({ course, onClose, onCreate, onUpdate, onDelete }) {
  const isEdit = Boolean(course?.id)
  const [form, setForm] = useState(() => (isEdit
    ? { code: course.code, title: course.title, credits: String(course.credits), term: course.term,
        instructor: course.instructor, capacity: String(course.capacity) }
    : EMPTY))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  function update(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
    setSubmitError('')
  }

  async function run(action) {
    setBusy(true)
    setSubmitError('')
    try {
      await action()
      onClose()
    } catch (failure) {
      setSubmitError(failure.message || 'The course could not be saved. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const next = validate(form)
    setErrors(next)
    if (Object.keys(next).length) return
    const input = {
      code: form.code.trim(), title: form.title.trim(), credits: Number(form.credits),
      term: form.term.trim(), instructor: form.instructor.trim(), capacity: Number(form.capacity),
    }
    run(() => (isEdit ? onUpdate(course.id, input) : onCreate(input)))
  }

  const field = (name, label, props = {}) => (
    <div className="field">
      <label htmlFor={`course-${name}`}>{label}</label>
      <input id={`course-${name}`} name={name} value={form[name]} onChange={update} {...props} />
      {errors[name] ? <span className="field__error">{errors[name]}</span> : null}
    </div>
  )

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()} role="presentation">
      <form
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-form-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <header className="modal-header">
          <div>
            <h2 id="course-form-title" className="modal-title">{isEdit ? 'Edit Course' : 'Add Course'}</h2>
            <span className="modal-subtitle">
              {isEdit
                ? `${course.enrolled} approved of ${course.capacity} seats`
                : 'A new offering appears in the catalog for students right away.'}
            </span>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close" disabled={busy}>
            &times;
          </button>
        </header>

        <div className="modal-body">
          <div className="course-form-grid">
            {field('code', 'Course code', { placeholder: 'e.g. CS320', maxLength: 30 })}
            {field('term', 'Academic term', { placeholder: 'e.g. 2024/2025', maxLength: 40 })}
          </div>
          {field('title', 'Title', { placeholder: 'e.g. Mobile Application Development', maxLength: 200 })}
          {field('instructor', 'Instructor', { placeholder: 'e.g. Dr. Rina Marlina', maxLength: 200 })}
          <div className="course-form-grid">
            {field('credits', 'Credits (SKS)', { type: 'number', min: 1, max: 12, step: 1 })}
            {field('capacity', 'Capacity (seats)', { type: 'number', min: 1, step: 1 })}
          </div>
          {isEdit ? (
            <p className="table__muted" style={{ margin: 0, fontSize: '12.5px' }}>
              Code and term cannot change once a student has enrolled. Capacity cannot go below the approved count.
            </p>
          ) : null}
          {submitError ? <p className="alert alert--error" role="alert" style={{ margin: 0 }}>{submitError}</p> : null}
          {confirmDelete ? (
            <p className="alert alert--error" style={{ margin: 0 }}>
              Delete {course.code}? This only works while no student has an enrollment for it.
            </p>
          ) : null}
        </div>

        <footer className="modal-footer" style={{ justifyContent: isEdit ? 'space-between' : 'flex-end' }}>
          {confirmDelete ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep course</button>
              <button type="button" className="btn btn--danger" onClick={() => run(() => onDelete(course.id))} disabled={busy}>
                {busy ? 'Deleting…' : 'Yes, delete course'}
              </button>
            </>
          ) : (
            <>
              {isEdit ? (
                <button type="button" className="btn btn--ghost" style={{ color: 'var(--color-danger)' }} onClick={() => setConfirmDelete(true)} disabled={busy}>
                  Delete course
                </button>
              ) : null}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add course'}
                </button>
              </div>
            </>
          )}
        </footer>
      </form>
    </div>
  )
}

export default CourseFormModal
