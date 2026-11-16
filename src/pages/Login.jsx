import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { apiFetch, setToken } from '../lib/api'

const DEMO_ACCOUNTS = [
  { role: 'Administrator', username: 'admin', password: 'admin123' },
  { role: 'Student', username: 'andi', password: 'student123' },
  { role: 'Student', username: 'bella', password: 'student123' },
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

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
        }),
      })

      setToken(result.token)
      onLogin(result.user)
      const redirectTo = location.state?.from || '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setSubmitError(error.message || 'Invalid username or password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__brand-inner">
          <img src={logo} alt="" width="44" height="44" />
          <h1 className="auth__brand-title">Campus Portal</h1>
          <p className="auth__brand-text">
            One place for course enrollment and grades across the university.
          </p>
        </div>
      </aside>

      <section className="auth__panel">
        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <h2 className="auth__title">Sign in</h2>
          <p className="auth__subtitle">
            Enter your campus credentials to continue.
          </p>

          {submitError ? (
            <p className="alert alert--error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={handleChange}
              placeholder="e.g. admin or andi"
            />
            {errors.username ? (
              <span className="field__error">{errors.username}</span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              placeholder="Your password"
            />
            {errors.password ? (
              <span className="field__error">{errors.password}</span>
            ) : null}
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="auth__demo">
            <span className="auth__demo-title">Demo accounts</span>
            <ul className="auth__demo-list">
              {DEMO_ACCOUNTS.map((item) => (
                <li key={item.username}>
                  <span className="auth__demo-role">{item.role}</span>{' '}
                  <code>{item.username}</code> / <code>{item.password}</code>
                </li>
              ))}
            </ul>
          </div>
        </form>
      </section>
    </div>
  )
}

export default Login