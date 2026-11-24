import { useEffect, useState } from 'react'
import { toLetterGrade } from '../utils/grade'

/**
 * Administrator: change or delete one recorded grade.
 * PUT /api/grades/:id { score } and DELETE /api/grades/:id. The server recomputes letter and points.
 */
function EditGradeModal({ grade, onClose, onSave, onDelete }) {
  const [score, setScore] = useState(grade ? String(grade.score) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  if (!grade) return null

  const value = Number(score)
  const valid = score.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 100
  const preview = valid ? toLetterGrade(value) : null

  async function run(action) {
    setBusy(true)
    setError('')
    try {
      await action()
      onClose()
    } catch (failure) {
      setError(failure.message || 'The change could not be saved. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!valid) {
      setError('Score must be a number between 0 and 100.')
      return
    }
    run(() => onSave(grade.id, value))
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()} role="presentation">
      <form
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-grade-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <header className="modal-header">
          <div>
            <h2 id="edit-grade-title" className="modal-title">Edit Grade</h2>
            <span className="modal-subtitle">
              {grade.studentName} · {grade.studentId} · {grade.courseCode} {grade.courseTitle} · Term {grade.term}
            </span>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close" disabled={busy}>
            &times;
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-banner">
            <div>
              <span className="modal-banner__label">Current</span>
              <span className="modal-banner__value">{grade.letter} · {grade.score} / 100</span>
            </div>
            <div>
              <span className="modal-banner__label">New</span>
              <span className="modal-banner__value">{preview ? `${preview.letter} · ${value} / 100` : '—'}</span>
            </div>
            <div>
              <span className="modal-banner__label">Credits</span>
              <span className="modal-banner__value">{grade.credits} SKS</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="edit-score">Raw Score (0–100)</label>
            <input
              id="edit-score"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={score}
              onChange={(event) => { setScore(event.target.value); setError('') }}
              autoFocus
            />
          </div>

          {error ? <p className="alert alert--error" role="alert" style={{ margin: 0 }}>{error}</p> : null}

          {confirmDelete ? (
            <p className="alert alert--error" style={{ margin: 0 }}>
              Delete this grade? The enrollment stays approved and appears again in the &quot;no grade yet&quot; list.
            </p>
          ) : null}
        </div>

        <footer className="modal-footer" style={{ justifyContent: 'space-between' }}>
          {confirmDelete ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
                Keep grade
              </button>
              <button type="button" className="btn btn--danger" onClick={() => run(() => onDelete(grade.id))} disabled={busy}>
                {busy ? 'Deleting…' : 'Yes, delete grade'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn--ghost" style={{ color: 'var(--color-danger)' }} onClick={() => setConfirmDelete(true)} disabled={busy}>
                Delete grade
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={busy || !valid}>
                  {busy ? 'Saving…' : 'Save grade'}
                </button>
              </div>
            </>
          )}
        </footer>
      </form>
    </div>
  )
}

export default EditGradeModal
