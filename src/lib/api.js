const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const TOKEN_KEY = 'campus_portal_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Single wrapper for all API calls
export async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  // If token expired or invalid (401), clear session and notify App
  if (response.status === 401) {
    clearToken()
    window.dispatchEvent(new Event('auth:unauthorized'))
  }

  if (response.status === 204) {
    return null
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed (${response.status})`
    const error = new Error(message)
    error.status = response.status
    error.code = payload?.error?.code
    throw error
  }

  return payload
}