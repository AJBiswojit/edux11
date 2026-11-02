import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { APP_CONFIG } from '@/config'
import { login as authLogin, logout as authLogout } from '@/services/auth'

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const raw = window.localStorage.getItem(APP_CONFIG.USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistTokens(access, refresh) {
  window.localStorage.setItem(APP_CONFIG.TOKEN_KEY, access)
  if (refresh) window.localStorage.setItem(APP_CONFIG.REFRESH_TOKEN_KEY, refresh)
  else window.localStorage.removeItem(APP_CONFIG.REFRESH_TOKEN_KEY)
}

function clearTokens() {
  window.localStorage.removeItem(APP_CONFIG.TOKEN_KEY)
  window.localStorage.removeItem(APP_CONFIG.REFRESH_TOKEN_KEY)
  window.localStorage.removeItem(APP_CONFIG.USER_KEY)
}

function persistSession(session) {
  if (!session?.accessToken) {
    throw new Error('Authentication did not return an access token')
  }
  const { accessToken, refreshToken, ...rest } = session
  const sessionUser = rest.user ?? rest
  persistTokens(accessToken, refreshToken)
  window.localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(sessionUser))
  return sessionUser
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(readStoredUser)
  const [status, setStatus] = useState(user ? 'authenticated' : 'anonymous')

  const login = useCallback(async ({ email, password, role, session }) => {
    /* Real backend authentication only — no DEMO_USERS, no fake tokens,
       no client-minted sess_* sessions. Registration verify returns JWT. */
    const next = session
      ? persistSession(session)
      : await authLogin({ email, password, role }).then(persistSession)
    setUser(next)
    setStatus('authenticated')
    return next
  }, [])

  const logout = useCallback(async () => {
    try {
      await authLogout()
    } catch {
      /* Server logout is a no-op (tokens are not revoked). Always clear locally. */
    }
    clearTokens()
    /* Drop the previous student's cached snapshots before the next login. */
    await queryClient.cancelQueries()
    queryClient.clear()
    setUser(null)
    setStatus('anonymous')
  }, [queryClient])

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch }
      window.localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  /** Persist JWTs returned mid-session (e.g. exam start extends access TTL). */
  const setTokens = useCallback((accessToken, refreshToken) => {
    if (!accessToken) return
    persistTokens(accessToken, refreshToken)
  }, [])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === APP_CONFIG.USER_KEY) setUser(e.newValue ? JSON.parse(e.newValue) : null)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(
    () => ({ user, status, isAuthenticated: !!user, login, logout, updateUser, setTokens }),
    [user, status, login, logout, updateUser, setTokens]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthProvider
