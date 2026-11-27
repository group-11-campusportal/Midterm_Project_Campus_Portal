import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

const emptyForm = { careerGoal: '', interests: '', skills: '', workload: 'balanced' }

const workloadOptions = [
  { value: 'light', label: 'Light — fewer credits' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'heavy', label: 'Heavy — more credits' },
]

function friendlyError(err) {
  if (err.code === 'AI_TIMEOUT') return 'The AI took too long to answer. Please try again.'
  if (err.code === 'AI_UNAVAILABLE') {
    return 'The AI service is not configured on the server right now. The rest of the portal still works.'
  }
  if (err.code === 'AI_RATE_LIMITED') return 'The AI service is busy. Please wait a minute and try again.'
  if (err.code === 'AI_FAILED' || err.code === 'AI_BAD_RESPONSE') {
    return 'The AI service returned an unexpected answer. Please try again shortly.'
  }
  return err.message || 'Unable to get course recommendations right now.'
}

// Student AI feature: POST /api/ai/course-recommendations. The student fills in their goals; the
// server adds their course history and the open catalog and returns 0–3 catalog courses.
function CourseRecommendation() {
  const [form, setForm] = useState(emptyForm)
  const [fieldError, setFieldError] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
    if (field === 'careerGoal') setFieldError('')
  }

  async function handleSubmit(event) {
    event?.preventDefault()
    if (isLoading) return
    if (!form.careerGoal.trim()) {
      setFieldError('Tell us which career you are interested in.')
      return
    }
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await apiFetch('/api/ai/course-recommendations', {
        method: 'POST',
        body: JSON.stringify({
          careerGoal: form.careerGoal.trim(),
          interests: form.interests.trim(),
          skills: form.skills.trim(),
          workload: form.workload,
        }),
      })
      setResult(response.data)
    } catch (err) {
      if (err.status !== 401) setError(friendlyError(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page-ai-advisor">
      <div className="section-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              Course Recommendation
            </h1>
            <span className="ai-tag-chip">
              <span className="ai-tag-chip__dot" aria-hidden="true" />
              AI Assistant
            </span>
          </div>
          <p className="page-subtitle">
            Tell the AI about your career plans and it will suggest up to three open courses that fit you.
          </p>
        </div>
      </div>

      <section className="card card--elevated card--spaced" aria-labelledby="rec-form-heading">
        <h2 id="rec-form-heading" className="card__title" style={{ marginBottom: '14px' }}>
          About You
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="rec-career">Which career are you interested in? *</label>
            <input
              id="rec-career"
              type="text"
              maxLength={120}
              placeholder="e.g. Data engineer, game developer, AI researcher"
              value={form.careerGoal}
              onChange={(e) => update('careerGoal', e.target.value)}
              disabled={isLoading}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? 'rec-career-error' : undefined}
            />
            {fieldError && (
              <span id="rec-career-error" className="field__error">{fieldError}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="rec-interests">Topics or subjects you enjoy</label>
            <textarea
              id="rec-interests"
              rows={2}
              maxLength={300}
              placeholder="e.g. math, databases, building web apps"
              value={form.interests}
              onChange={(e) => update('interests', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="field">
            <label htmlFor="rec-skills">Skills you want to build</label>
            <textarea
              id="rec-skills"
              rows={2}
              maxLength={300}
              placeholder="e.g. problem solving, SQL, system design"
              value={form.skills}
              onChange={(e) => update('skills', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="field" style={{ maxWidth: '320px' }}>
            <label htmlFor="rec-workload">Preferred workload</label>
            <select
              id="rec-workload"
              value={form.workload}
              onChange={(e) => update('workload', e.target.value)}
              disabled={isLoading}
            >
              {workloadOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn--primary" disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Finding courses (up to 25s)...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                  <path d="M10 2v3m0 10v3M2 10h3m10 0h3M4.93 4.93l2.12 2.12m5.9 5.9l2.12 2.12M4.93 15.07l2.12-2.12m5.9-5.9l2.12-2.12" />
                  <circle cx="10" cy="10" r="2.5" />
                </svg>
                <span>Get Recommendations</span>
              </>
            )}
          </button>
        </form>

        {isLoading && (
          <div className="ai-loading-callout" role="status" aria-live="polite">
            <div className="ai-loading-callout__spinner" aria-hidden="true" />
            <div>
              <p className="ai-loading-callout__title">Looking for courses that fit you</p>
              <p className="ai-loading-callout__text">
                The AI is comparing your goals and past grades with the open course catalog.
              </p>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="banner banner--error" role="alert" style={{ marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
              Recommendation Unsuccessful
            </strong>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>{error}</p>
            <div style={{ marginTop: '10px' }}>
              <button type="button" className="btn btn--small btn--outline" onClick={handleSubmit}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="ai-results-container" aria-live="polite">
          <section className="card card--elevated card--spaced ai-summary-card">
            <div className="ai-summary-card__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="ai-summary-card__title">Summary</h2>
                {result.aiGenerated && <span className="badge badge--ai-generated">AI-generated</span>}
              </div>
              <span className="ai-summary-card__meta">
                {new Date(result.generatedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="ai-summary-card__body">{result.summary}</p>
          </section>

          <section aria-labelledby="rec-list-heading">
            <h2 id="rec-list-heading" className="section-head__title" style={{ fontSize: '18px', margin: '0 0 16px' }}>
              Recommended Courses ({result.recommendations.length})
            </h2>

            {result.recommendations.length === 0 ? (
              <div className="card card--elevated" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
                  No matching course right now
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }}>
                  None of the open courses fits your answers. Try describing your goals differently.
                </p>
              </div>
            ) : (
              <div className="ai-cards-grid">
                {result.recommendations.map((course, index) => (
                  <article key={course.courseId} className="card card--elevated ai-student-card">
                    <div className="ai-student-card__header">
                      <div>
                        <h3 className="ai-student-card__name">{course.title}</h3>
                        <p className="ai-student-card__id">{course.code} · Term {course.term}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <span className="badge badge--info">#{index + 1} PICK</span>
                        <span className="ai-student-card__gpa">
                          <strong>{course.credits}</strong> credits
                        </span>
                      </div>
                    </div>
                    <div className="ai-student-card__section ai-student-card__section--action">
                      <div className="ai-section-label">
                        <span>Why this course</span>
                        <span className="badge-micro-ai">AI-generated</span>
                      </div>
                      <p className="ai-section-text">{course.reason}</p>
                    </div>
                    <p className="ai-student-card__gpa" style={{ margin: 0 }}>Instructor: {course.instructor}</p>
                  </article>
                ))}
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <Link to="/form" className="btn btn--outline">Go to Enroll in Course</Link>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default CourseRecommendation
