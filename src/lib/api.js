const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const TOKEN_KEY = 'campus_portal_token'
const TIMEOUT_MS = 20000
// The backend gives the AI provider up to 25 s (including a retry and the fallback model).
export const AI_TIMEOUT_MS = 30000

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

function apiError(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

// Single wrapper for all API calls. Options are passed to fetch, plus `timeoutMs`.
export async function apiFetch(path, { timeoutMs = TIMEOUT_MS, ...options } = {}) {
  const token = getToken()
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  // A sleeping or unreachable server must end in a clear message, not an endless spinner.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal })
  } catch (error) {
    throw error?.name === 'AbortError'
      ? apiError(0, 'TIMEOUT', 'The server took too long to answer. Please try again.')
      : apiError(0, 'NETWORK', 'Cannot reach the server. Check your internet connection and try again.')
  } finally {
    clearTimeout(timer)
  }

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
    throw apiError(response.status, payload?.error?.code,
      payload?.error?.message || `Request failed (${response.status})`)
  }

  return payload
}
