import { API_URL, apiUrlProblem, usesLocalhost } from './config'

const TIMEOUT_MS = 20000
const AI_TIMEOUT_MS = 30000 // Backend Gemini advisor allows up to 25 s including retry/fallback.

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

let currentToken = null
let unauthorizedHandler = null

// The AuthProvider keeps these in sync so every request carries the same token
// and any 401 sends the user back to the login screen.
export function setApiToken(token) {
  currentToken = token
}

export function onUnauthorized(handler) {
  unauthorizedHandler = handler
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null
  }
}

export async function apiFetch(
  path,
  { method = 'GET', body, auth = true, timeoutMs = TIMEOUT_MS } = {},
) {
  const problem = apiUrlProblem()
  if (problem) throw new ApiError(0, 'CONFIG', problem)

  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && currentToken) headers.Authorization = `Bearer ${currentToken}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'The server took too long to answer. Please try again.'
      : usesLocalhost
        ? `Network request failed. ${API_URL} on a phone only works over USB after: adb reverse tcp:3000 tcp:3000`
        : `Network request failed. Check EXPO_PUBLIC_API_URL (${API_URL}) and your internet connection.`
    throw new ApiError(0, 'NETWORK', message)
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 204) return null

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // Non-JSON body (e.g. an HTML error page from a proxy).
  }

  if (!response.ok) {
    const code = payload?.error?.code || 'HTTP_ERROR'
    const message = payload?.error?.message || `Request failed with status ${response.status}.`
    // A 401 on an authenticated call means the token is missing, expired or revoked.
    if (response.status === 401 && auth && unauthorizedHandler) unauthorizedHandler()
    throw new ApiError(response.status, code, message)
  }
  return payload
}

// One function per route, matching the §5 API contract field names.
export const api = {
  login: (username, password) =>
    apiFetch('/api/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: () => apiFetch('/api/auth/me'),
  courses: () => apiFetch('/api/courses').then((r) => r.data),
  course: (id) => apiFetch(`/api/courses/${encodeURIComponent(id)}`).then((r) => r.data),
  enrollments: () => apiFetch('/api/enrollments').then((r) => r.data),
  createEnrollment: (courseId) =>
    apiFetch('/api/enrollments', { method: 'POST', body: { courseId } }).then((r) => r.data),
  grades: () => apiFetch('/api/grades').then((r) => r.data),
  // Administrator only (403 for a student).
  students: () => apiFetch('/api/students').then((r) => r.data),
  createGrade: (enrollmentId, score) =>
    apiFetch('/api/grades', { method: 'POST', body: { enrollmentId, score } }).then((r) => r.data),
  updateGrade: (id, score) =>
    apiFetch(`/api/grades/${encodeURIComponent(id)}`, { method: 'PUT', body: { score } }).then((r) => r.data),
  deleteGrade: (id) => apiFetch(`/api/grades/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createCourse: (input) => apiFetch('/api/courses', { method: 'POST', body: input }).then((r) => r.data),
  updateCourse: (id, input) =>
    apiFetch(`/api/courses/${encodeURIComponent(id)}`, { method: 'PUT', body: input }).then((r) => r.data),
  deleteCourse: (id) => apiFetch(`/api/courses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  // Student: withdraw an own pending request. Administrator: delete a pending or rejected one.
  deleteEnrollment: (id) => apiFetch(`/api/enrollments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateEnrollmentStatus: (id, status) =>
    apiFetch(`/api/enrollments/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    }),
  aiAtRiskSummary: (term) =>
    apiFetch('/api/ai/at-risk-summary', {
      method: 'POST',
      body: { term },
      timeoutMs: AI_TIMEOUT_MS,
    }).then((r) => r.data),
}
