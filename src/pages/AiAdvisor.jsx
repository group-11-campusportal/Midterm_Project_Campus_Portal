import { useState } from 'react'
import { apiFetch } from '../lib/api'

function AiAdvisor({ courses = [] }) {
  // Extract unique terms from available courses or fallback to current academic term
  const availableTerms = Array.from(
    new Set(courses.map((c) => c.term).filter(Boolean)),
  )
  if (!availableTerms.includes('2024/2025')) {
    availableTerms.unshift('2024/2025')
  }

  const [selectedTerm, setSelectedTerm] = useState(availableTerms[0] || '2024/2025')
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleGenerateReport() {
    setIsLoading(true)
    setError(null)
    setReport(null)

    try {
      const response = await apiFetch('/api/ai/at-risk-summary', {
        method: 'POST',
        body: JSON.stringify({ term: selectedTerm }),
      })
      setReport(response.data)
    } catch (err) {
      // Friendly, actionable error messages per Capstone checklist requirements
      let friendlyMessage = err.message || 'Unable to generate AI advisor report.'
      if (err.message?.includes('timeout') || err.message?.includes('too long')) {
        friendlyMessage = 'The AI evaluation service took longer than expected to process student records. Please try again.'
      } else if (err.message?.includes('not configured') || err.message?.includes('unavailable')) {
        friendlyMessage = 'The AI advisor service is currently not configured or unavailable on the server. Your academic records are intact.'
      } else if (err.message?.includes('busy')) {
        friendlyMessage = 'The AI service is experiencing high load. Please wait a moment and try again.'
      }
      setError(friendlyMessage)
    } finally {
      setIsLoading(false)
    }
  }

  function getRiskBadgeClass(level) {
    if (level === 'high') return 'badge badge--danger'
    if (level === 'medium') return 'badge badge--warning'
    return 'badge badge--info'
  }

  return (
    <div className="page-ai-advisor">
      {/* Page Header */}
      <div className="section-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              AI Academic Advisor
            </h1>
            <span className="ai-tag-chip">
              <span className="ai-tag-chip__dot" aria-hidden="true" />
              AI Assistant
            </span>
          </div>
          <p className="page-subtitle">
            Early detection and automated academic performance analysis for undergraduate students (UC-8).
          </p>
        </div>
      </div>

      {/* Control Panel Card */}
      <section className="card card--elevated card--spaced" aria-labelledby="ai-controls-heading">
        <h2 id="ai-controls-heading" className="card__title" style={{ marginBottom: '14px' }}>
          Report Parameters
        </h2>
        <div className="ai-controls-bar">
          <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
            <label htmlFor="ai-term-select" className="form-label">
              Academic Term
            </label>
            <select
              id="ai-term-select"
              className="form-control"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              disabled={isLoading}
            >
              {availableTerms.map((term) => (
                <option key={term} value={term}>
                  Term {term}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1, gap: '12px' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleGenerateReport}
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Evaluating records (up to 20s)...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                    <path d="M10 2v3m0 10v3M2 10h3m10 0h3M4.93 4.93l2.12 2.12m5.9 5.9l2.12 2.12M4.93 15.07l2.12-2.12m5.9-5.9l2.12-2.12" />
                    <circle cx="10" cy="10" r="2.5" />
                  </svg>
                  <span>Generate Advisor Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="ai-loading-callout" role="status" aria-live="polite">
            <div className="ai-loading-callout__spinner" aria-hidden="true" />
            <div>
              <p className="ai-loading-callout__title">AI Advisor Analysis in Progress</p>
              <p className="ai-loading-callout__text">
                Aggregating GPA metrics, grade distribution, and course registration history for term {selectedTerm}.
                Please wait a moment while the model evaluates academic risk factors.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Error Callout (Requirement: Friendly message when AI fails) */}
      {error && (
        <div className="banner banner--error" role="alert" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                AI Analysis Unsuccessful
              </strong>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>{error}</p>
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn--small btn--outline"
                  onClick={handleGenerateReport}
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results View */}
      {report && (
        <div className="ai-results-container" aria-live="polite">
          {/* Executive Summary Card */}
          <section className="card card--elevated card--spaced ai-summary-card">
            <div className="ai-summary-card__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="ai-summary-card__title">Executive Summary</h2>
                <span className="badge badge--ai-generated">AI-generated</span>
              </div>
              <span className="ai-summary-card__meta">
                Term {report.term} · {new Date(report.generatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="ai-summary-card__body">
              {report.overallSummary}
            </p>
          </section>

          {/* At-Risk Students List */}
          <section aria-labelledby="at-risk-list-heading">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 id="at-risk-list-heading" className="section-head__title" style={{ fontSize: '18px', margin: 0 }}>
                Flagged Students ({report.atRiskStudents?.length || 0})
              </h2>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Sorted by priority (High → Low)
              </span>
            </div>

            {(!report.atRiskStudents || report.atRiskStudents.length === 0) ? (
              <div className="card card--elevated" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="24" height="24" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
                  No Academic Risk Indicators Detected
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                  All enrolled students in term {report.term} meet academic progress thresholds with satisfactory grades and registrations.
                </p>
              </div>
            ) : (
              <div className="ai-cards-grid">
                {report.atRiskStudents.map((student) => (
                  <article key={student.studentId} className="card card--elevated ai-student-card">
                    <div className="ai-student-card__header">
                      <div>
                        <h3 className="ai-student-card__name">{student.studentName}</h3>
                        <p className="ai-student-card__id">{student.studentId}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <span className={getRiskBadgeClass(student.riskLevel)}>
                          {student.riskLevel.toUpperCase()} RISK
                        </span>
                        <span className="ai-student-card__gpa">
                          GPA: <strong>{Number(student.gpa).toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="ai-student-card__section">
                      <div className="ai-section-label">
                        <span>Identified Risk Factors</span>
                        <span className="badge-micro-ai">AI-generated</span>
                      </div>
                      <p className="ai-section-text">{student.reason}</p>
                    </div>

                    <div className="ai-student-card__section ai-student-card__section--action">
                      <div className="ai-section-label">
                        <span>Recommended Advising Action</span>
                        <span className="badge-micro-ai">AI-generated</span>
                      </div>
                      <p className="ai-section-text">{student.recommendation}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default AiAdvisor
