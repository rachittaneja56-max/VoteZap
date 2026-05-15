import { createContext, useContext } from 'react'

export interface AuthUser {
  id: string
  email: string
  name?: string
  googleId?: string
  customIdpId?: string
}

export interface AuthPayload {
  user: AuthUser
}

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  isAuthenticated: boolean
  refreshSession: () => Promise<AuthUser | null>
  signIn: (payload: unknown) => AuthUser | null
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
