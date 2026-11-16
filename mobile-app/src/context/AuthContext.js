import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, onUnauthorized, setApiToken } from '../lib/api'
import { clearToken, loadToken, saveToken } from '../lib/session'

const AuthContext = createContext(null)

// status: 'loading' while the stored token is checked, then 'signedIn' or 'signedOut'.
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [gpa, setGpa] = useState(null)

  const clearSession = useCallback(async () => {
    setApiToken(null)
    await clearToken()
    setUser(null)
    setGpa(null)
    setStatus('signedOut')
  }, [])

  // Any 401 from any screen ends the session; the router guard then shows /login.
  useEffect(() => onUnauthorized(() => { clearSession() }), [clearSession])

  // On app start, reuse a stored token only if the server still accepts it.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await loadToken()
      if (!token) {
        if (!cancelled) setStatus('signedOut')
        return
      }
      setApiToken(token)
      try {
        const me = await api.me()
        if (cancelled) return
        setUser(me.user)
        setGpa(me.gpa ?? null)
        setStatus('signedIn')
      } catch (error) {
        if (cancelled) return
        if (error.status === 401) {
          await clearSession()
        } else {
          // Offline or server asleep: keep the token, show the app, screens will show the error.
          setStatus('signedIn')
        }
      }
    })()
    return () => { cancelled = true }
  }, [clearSession])

  const signIn = useCallback(async (username, password) => {
    const result = await api.login(username, password)
    await saveToken(result.token)
    setApiToken(result.token)
    setUser(result.user)
    try {
      const me = await api.me()
      setGpa(me.gpa ?? null)
    } catch {
      setGpa(null)
    }
    setStatus('signedIn')
  }, [])

  const refreshMe = useCallback(async () => {
    const me = await api.me()
    setUser(me.user)
    setGpa(me.gpa ?? null)
  }, [])

  const value = useMemo(
    () => ({ status, user, gpa, signIn, signOut: clearSession, clearSession, refreshMe }),
    [status, user, gpa, signIn, clearSession, refreshMe],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.')
  return context
}
