import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { apiFetch, parseJsonResponse } from '../lib/api'
import { clearPkceSession, readPkceSession } from '../lib/pkce'
import { useAuth } from '../lib/auth-context'

const customIdpExchangeByCode = new Map<string, Promise<unknown>>()

function getOrStartCustomIdpExchange(code: string, codeVerifier: string): Promise<unknown> {
  const existing = customIdpExchangeByCode.get(code)
  if (existing) {
    return existing
  }
  const promise = (async () => {
    const res = await apiFetch('/api/auth/custom-idp', {
      method: 'POST',
      body: JSON.stringify({ code, code_verifier: codeVerifier })
    })
    return parseJsonResponse(res)
  })()
  customIdpExchangeByCode.set(code, promise)
  void promise.finally(() => {
    window.setTimeout(() => {
      customIdpExchangeByCode.delete(code)
    }, 15_000)
  })
  return promise
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return

      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')
      const idpError = params.get('error')
      const idpDesc = params.get('error_description')

      if (idpError) {
        setError(idpDesc || idpError || 'Sign-in was cancelled or failed.')
        return
      }

      const session = readPkceSession()
      if (!code || !state) {
        setError('Missing authorization response. Return to login and try again.')
        return
      }
      if (!session) {
        setError('Your login session expired. Please start again from the login page.')
        return
      }
      if (session.state !== state) {
        clearPkceSession()
        setError('Security check failed (state mismatch). Please try again.')
        return
      }

      setMessage('Completing sign-in...')
      void getOrStartCustomIdpExchange(code, session.verifier)
        .then((data) => {
          if (cancelled) {
            return
          }
          signIn(data)
          clearPkceSession()
          const redirectTo = sessionStorage.getItem('authRedirectTo') || '/dashboard'
          sessionStorage.removeItem('authRedirectTo')
          navigate(redirectTo, { replace: true })
        })
        .catch((e: unknown) => {
          if (cancelled) {
            return
          }
          clearPkceSession()
          setMessage(null)
          setError(e instanceof Error ? e.message : 'Sign-in failed')
        })
    })

    return () => {
      cancelled = true
    }
  }, [navigate, signIn])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        {!error && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-slate-600" aria-hidden />
            <p className="text-sm text-slate-600">{message ?? 'Processing...'}</p>
          </div>
        )}
        {error && (
          <div className="space-y-4">
            <p className="text-sm text-red-700">{error}</p>
            <Link
              to="/login"
              className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Try again
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
