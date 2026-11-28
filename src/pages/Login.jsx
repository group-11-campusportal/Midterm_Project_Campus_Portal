import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiFetch, setToken } from '../lib/api'

const DEMO_ACCOUNTS = [
  { role: 'Student', username: 'andi', password: 'student123', label: 'Andi (Student)', color: '#2563eb' },
  { role: 'Student', username: 'bella', password: 'student123', label: 'Bella (Student)', color: '#2563eb' },
  { role: 'Administrator', username: 'admin', password: 'admin123', label: 'System Admin', color: '#7c3aed' },
]

function Login({ onLogin }) {
  const navigate = useNavigate()
  const location = useLocation()
  // 'signin' uses an existing account; 'signup' creates a new student account.
  const [mode, setMode] = useState('signin')
  const isSignUp = mode === 'signup'
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: '' }))
    setSubmitError('')
  }

  function switchMode() {
    setMode(isSignUp ? 'signin' : 'signup')
    setForm({ username: '', email: '', password: '', confirm: '' })
    setErrors({})
    setSubmitError('')
  }

  function fillDemo(acc) {
    setForm({ username: acc.username, email: '', password: acc.password, confirm: '' })
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
    if (isSignUp) {
      if (!form.email.trim()) {
        nextErrors.email = 'University email is required.'
      } else if (!/^[a-z0-9._%+-]+@student\.campus\.edu$/i.test(form.email.trim())) {
        nextErrors.email = 'Use your university email ending in @student.campus.edu.'
      }
      if (form.username.trim() && !/^[a-z0-9._-]{3,30}$/i.test(form.username.trim())) {
        nextErrors.username = 'Use 3-30 letters, numbers, dots, dashes or underscores.'
      }
      if (form.password && !(form.password.length >= 8 && /[A-Z]/.test(form.password) && /[^A-Za-z0-9\s]/.test(form.password))) {
        nextErrors.password = 'Use at least 8 characters, one capital letter and one special character (e.g. ! @ # ?).'
      }
      if (form.password !== form.confirm) {
        nextErrors.confirm = 'Passwords do not match.'
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await apiFetch(isSignUp ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: form.username.trim(),
          ...(isSignUp ? { email: form.email.trim() } : {}),
          password: form.password,
        }),
      })

      setToken(result.token)
      onLogin(result.user)
      const redirectTo = location.state?.from || '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setSubmitError(error.message || (isSignUp
        ? 'Could not create the account. Try again.'
        : 'Invalid username or password. Check your credentials and try again.'))
    } finally {
      setIsSubmitting(false)
    }
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
              <span>Credit-Weighted GPA Calculation</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="auth__panel">
        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="auth__form-head">
            <h2 className="auth__title">{isSignUp ? 'Create student account' : 'Sign in'}</h2>
            <p className="auth__subtitle">
              {isSignUp
                ? 'Choose a username and password. You can sign in with them right away.'
                : 'Enter your campus credentials to continue.'}
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
                placeholder={isSignUp ? 'e.g. budi.santoso' : 'e.g. admin or andi'}
                disabled={isSubmitting}
              />
            </div>
            {errors.username ? (
              <span className="field__error">{errors.username}</span>
            ) : null}
          </div>

          {isSignUp ? (
            <div className="field">
              <label htmlFor="email">University email</label>
              <div className={`input-wrap ${errors.email ? 'input-wrap--error' : ''}`}>
                <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="5" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3.5 6l6.5 5 6.5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@student.campus.edu"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email ? (
                <span className="field__error">{errors.email}</span>
              ) : null}
            </div>
          ) : null}

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
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={form.password}
                onChange={handleChange}
                placeholder={isSignUp ? '8+ characters, 1 capital, 1 special' : 'Your password'}
                disabled={isSubmitting}
              />
            </div>
            {errors.password ? (
              <span className="field__error">{errors.password}</span>
            ) : null}
          </div>

          {isSignUp ? (
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <div className={`input-wrap ${errors.confirm ? 'input-wrap--error' : ''}`}>
                <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="4" y="9" width="12" height="8" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 9V6a3 3 0 0 1 6 0v3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="Type the password again"
                  disabled={isSubmitting}
                />
              </div>
              {errors.confirm ? (
                <span className="field__error">{errors.confirm}</span>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            className="btn btn--primary btn--gradient btn--block"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              isSignUp ? 'Creating account…' : 'Signing in…'
            ) : (
              <>
                <span>{isSignUp ? 'Create account' : 'Sign in to Portal'}</span>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                  <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>

          <p className="auth__switch">
            {isSignUp ? 'Already have an account?' : 'New student?'}{' '}
            <button type="button" className="auth__switch-btn" onClick={switchMode} disabled={isSubmitting}>
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          {/* Quick Click-to-Fill Demo Accounts */}
          {isSignUp ? null : (
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
                    aria-label={`Quick fill ${acc.label} credentials`}
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
          )}
        </form>
      </section>
    </div>
  )
}

export default Login