import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { apiFetch, parseJsonResponse } from './api'
import {
  AuthContext,
  type AuthContextValue,
  type AuthPayload,
  type AuthStatus,
  type AuthUser
} from './auth-context'

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthPayload>
    return parsed.user?.id && parsed.user.email ? parsed.user : null
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

function extractUser(payload: unknown): AuthUser | null {
  const maybe = payload as Partial<AuthPayload> | null
  return maybe?.user?.id && maybe.user.email ? maybe.user : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readCachedUser())
  const [status, setStatus] = useState<AuthStatus>(() =>
    readCachedUser() ? 'authenticated' : 'checking'
  )

  const signIn = useCallback((payload: unknown) => {
    const nextUser = extractUser(payload)
    if (!nextUser) return null
    localStorage.setItem('user', JSON.stringify({ user: nextUser }))
    setUser(nextUser)
    setStatus('authenticated')
    return nextUser
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const data = await parseJsonResponse<AuthPayload>(await apiFetch('/auth/me', { method: 'GET' }))
      signIn(data)
      return data.user
    } catch {
      try {
        const refreshed = await parseJsonResponse<AuthPayload>(
          await apiFetch('/auth/refresh', { method: 'POST' })
        )
        signIn(refreshed)
        return refreshed.user
      } catch {
        localStorage.removeItem('user')
        setUser(null)
        setStatus('anonymous')
        return null
      }
    }
  }, [signIn])

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem('user')
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        void refreshSession()
      }
    })
    return () => {
      cancelled = true
    }
  }, [refreshSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated' && Boolean(user),
      refreshSession,
      signIn,
      logout
    }),
    [logout, refreshSession, signIn, status, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
