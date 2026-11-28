import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, onUnauthorized, setApiToken } from '../lib/api'
import { clearToken, loadToken, loadUser, saveToken, saveUser } from '../lib/session'

const AuthContext = createContext(null)

// status: 'loading' while the stored token is checked, then 'signedIn' or 'signedOut', or
// 'offline' when the server cannot be reached and no saved profile exists (retry with `retry`).
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [gpa, setGpa] = useState(null)
  // Number of graded courses; 0 means "no grades yet" even though the API reports gpa 0.
  const [gradedCount, setGradedCount] = useState(null)

  const clearSession = useCallback(async () => {
    setApiToken(null)
    await clearToken()
    setUser(null)
    setGpa(null)
    setGradedCount(null)
    setStatus('signedOut')
  }, [])

  // Any 401 from any screen ends the session; the router guard then shows /login.
  useEffect(() => onUnauthorized(() => { clearSession() }), [clearSession])

  // On app start, reuse a stored token only if the server still accepts it.
  const restore = useCallback(async (token, isCancelled = () => false) => {
    if (!token) {
      if (!isCancelled()) setStatus('signedOut')
      return
    }
    setApiToken(token)
    try {
      const me = await api.me()
      if (isCancelled()) return
      setUser(me.user)
      setGpa(me.gpa ?? null)
      setGradedCount(me.gradedCount ?? null)
      saveUser(me.user)
      setStatus('signedIn')
    } catch (error) {
      if (isCancelled()) return
      if (error.status === 401) {
        await clearSession()
        return
      }
      // Offline or server asleep: keep the token. With the saved profile the app opens with the
      // right role (screens show their own retry); without one, ask to retry instead of guessing.
      const saved = await loadUser()
      if (isCancelled()) return
      if (saved) {
        setUser(saved)
        setStatus('signedIn')
      } else {
        setStatus('offline')
      }
    }
  }, [clearSession])

  useEffect(() => {
    let cancelled = false
    loadToken().then((token) => restore(token, () => cancelled))
    return () => { cancelled = true }
  }, [restore])

  const retry = useCallback(() => {
    setStatus('loading')
    loadToken().then((token) => restore(token))
  }, [restore])

  // Sign-up answers with the same { token, user } as login, so both start the session the same way.
  const startSession = useCallback(async (result) => {
    await saveToken(result.token)
    await saveUser(result.user)
    setApiToken(result.token)
    setUser(result.user)
    try {
      const me = await api.me()
      setGpa(me.gpa ?? null)
      setGradedCount(me.gradedCount ?? null)
    } catch {
      setGpa(null)
      setGradedCount(null)
    }
    setStatus('signedIn')
  }, [])

  const signIn = useCallback(
    async (username, password) => startSession(await api.login(username, password)),
    [startSession],
  )
  const signUp = useCallback(
    async (username, email, password) => startSession(await api.register(username, email, password)),
    [startSession],
  )

  const refreshMe = useCallback(async () => {
    const me = await api.me()
    setUser(me.user)
    setGpa(me.gpa ?? null)
    setGradedCount(me.gradedCount ?? null)
    saveUser(me.user)
  }, [])

  const value = useMemo(
    () => ({ status, user, gpa, gradedCount, signIn, signUp, signOut: clearSession, clearSession, refreshMe, retry }),
    [status, user, gpa, gradedCount, signIn, signUp, clearSession, refreshMe, retry],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.')
  return context
}
