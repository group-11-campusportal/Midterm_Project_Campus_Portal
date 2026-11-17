import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { users } from '../data/users'

const DEMO_ACCOUNTS = [
  { role: 'Student', username: 'andi', password: 'student123', label: 'Andi (Student)', color: '#2563eb' },
  { role: 'Student', username: 'bella', password: 'student123', label: 'Bella (Student)', color: '#2563eb' },
  { role: 'Administrator', username: 'admin', password: 'admin123', label: 'System Admin', color: '#7c3aed' },
]

function Login({ onLogin }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: '' }))
    setSubmitError('')
  }

  function fillDemo(acc) {
    setForm({ username: acc.username, password: acc.password })
    setErrors({})
    setSubmitError('')
  }

  function validate() {
    const nextErrors = {}
    if (!form.username.trim()) {
      nextErrors.username = 'Username is required.'
    }
    if (!form.password) {
      nextErrors.password = 'Password is required.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    window.setTimeout(() => {
      const matchedUser = users.find(
        (user) =>
          user.username === form.username.trim() &&
          user.password === form.password,
      )

      if (!matchedUser) {
        setSubmitError('Invalid username or password. Please try again.')
        setIsSubmitting(false)
        return
      }

      onLogin(matchedUser)
      const redirectTo = location.state?.from || '/dashboard'
      navigate(redirectTo, { replace: true })
    }, 500)
  }

  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__brand-deco1" />
        <div className="auth__brand-deco2" />
        <div className="auth__brand-inner">
          <div className="auth__logo-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="36" height="36" aria-hidden="true">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <h1 className="auth__brand-title">Campus Portal</h1>
          <p className="auth__brand-text">
            University Grades &amp; Enrollment Management System
          </p>

          <div className="auth__features">
            <div className="auth__feature-item">
              <span className="auth__feature-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>Unified Student &amp; Administrator Portals</span>
            </div>
            <div className="auth__feature-item">
              <span className="auth__feature-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>Real-Time Enrollment Approvals &amp; Tracking</span>
            </div>
            <div className="auth__feature-item">
              <span className="auth__feature-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>Credit-Weighted GPA Calculation &amp; Honors</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="auth__panel">
        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="auth__form-head">
            <h2 className="auth__title">Sign in</h2>
            <p className="auth__subtitle">
              Enter your campus credentials to continue.
            </p>
          </div>

          {submitError ? (
            <p className="alert alert--error" role="alert">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true" style={{ flexShrink: 0, marginRight: 6 }}>
                <circle cx="10" cy="10" r="7" />
                <line x1="10" y1="7" x2="10" y2="10" />
                <circle cx="10" cy="13" r="0.5" fill="currentColor" />
              </svg>
              <span>{submitError}</span>
            </p>
          ) : null}

          <div className="field">
            <label htmlFor="username">Username</label>
            <div className={`input-wrap ${errors.username ? 'input-wrap--error' : ''}`}>
              <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 17a6 6 0 0 1 12 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                placeholder="e.g. admin or andi"
                disabled={isSubmitting}
              />
            </div>
            {errors.username ? (
              <span className="field__error">{errors.username}</span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className={`input-wrap ${errors.password ? 'input-wrap--error' : ''}`}>
              <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="4" y="9" width="12" height="8" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 9V6a3 3 0 0 1 6 0v3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Your password"
                disabled={isSubmitting}
              />
            </div>
            {errors.password ? (
              <span className="field__error">{errors.password}</span>
            ) : null}
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--gradient btn--block"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Signing in…'
            ) : (
              <>
                <span>Sign in to Portal</span>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                  <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>

          {/* Quick Click-to-Fill Demo Accounts */}
          <div className="auth__demo">
            <div className="auth__demo-header">
              <span className="auth__demo-title">Quick Demo Sign In</span>
              <span className="auth__demo-hint">click to fill</span>
            </div>
            <div className="auth__demo-grid">
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = form.username === acc.username
                return (
                  <button
                    key={acc.username}
                    type="button"
                    className={`auth__demo-card ${isSelected ? 'auth__demo-card--active' : ''}`}
                    onClick={() => fillDemo(acc)}
                  >
                    <div className="auth__demo-top">
                      <span
                        className="auth__demo-dot"
                        style={{ backgroundColor: acc.color }}
                      />
                      <span className="auth__demo-label">{acc.label}</span>
                    </div>
                    <code className="auth__demo-creds">
                      {acc.username} / {acc.password}
                    </code>
                  </button>
                )
              })}
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}

export default Login
